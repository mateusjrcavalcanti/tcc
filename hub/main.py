import os
import argparse
import asyncio
from dbus_next.aio import MessageBus
from dbus_next import Variant, BusType
from gatt_server import register_gatt_application
from constants import SHARED_DIR, ADAPTER_PATH, DEVICE_NAME
from bluetooth import setup_advertising, print_bluetooth_status, print_status_summary, unpair_all_devices, monitor_events, register_advertisement, unregister_advertisement, start_event_listeners


async def main(poll: int | None = None):
    bus = await MessageBus(bus_type=BusType.SYSTEM).connect()

    # Configurar adaptador Bluetooth
    introspect = await bus.introspect('org.bluez', ADAPTER_PATH)
    adapter = bus.get_proxy_object('org.bluez', ADAPTER_PATH, introspect)
    props_iface = adapter.get_interface('org.freedesktop.DBus.Properties')

    # Renomear adaptador e ligar
    await props_iface.call_set('org.bluez.Adapter1', 'Alias', Variant('s', DEVICE_NAME))
    await props_iface.call_set('org.bluez.Adapter1', 'Powered', Variant('b', True))

    # Desparear todos os dispositivos na inicialização (limpeza)
    await unpair_all_devices(bus)

    # Registrar aplicação GATT
    registration_result = await register_gatt_application(bus)
    # registration_result é (True, [uuids]) ou (False, [])
    if isinstance(registration_result, tuple):
        registration_success, service_uuids = registration_result
    else:
        registration_success = bool(registration_result)
        service_uuids = []

    # Registrar advertising LE explicitamente, se possível
    advertisement = None
    adv_manager = None
    if registration_success:
        # registrar objeto advertisement (usamos o service UUID do FileService se disponível)
        advertisement, adv_manager = await register_advertisement(bus, ADAPTER_PATH, service_uuids=service_uuids, local_name=DEVICE_NAME)
        if advertisement is None:
            # fallback para ajustar propriedades do adaptador
            await setup_advertising(bus)
    else:
        print("GATT registration failed, continuing without advertising")

    print("Servidor GATT BLE pronto! Conecte pelo seu celular ou app BLE.")

    # Iniciar listeners D-Bus para eventos (mais eficiente que polling)
    listeners_task = asyncio.create_task(start_event_listeners(bus))

    # Obter status do adaptador Bluetooth e imprimir resumo consolidado (evita logs duplicados)
    try:
        if poll is None:
            status = await print_bluetooth_status(bus)
            print_status_summary(status, DEVICE_NAME, SHARED_DIR)

            # Manter o programa rodando
            await asyncio.Future()
        else:
            # Atualização periódica: limpar terminal e reimprimir o resumo a cada <poll> segundos
            while True:
                status = await print_bluetooth_status(bus)
                # limpar tela
                os.system('clear')
                print("Servidor GATT BLE pronto! Conecte pelo seu celular ou app BLE.")
                print_status_summary(status, DEVICE_NAME, SHARED_DIR)
                await asyncio.sleep(poll)
    finally:
        # desregistrar advertisement se foi registrado
        try:
            if advertisement is not None and adv_manager is not None:
                await unregister_advertisement(bus, advertisement, adv_manager)
        except Exception as e:
            print(f"Erro ao desregistrar advertisement no final: {e}")

        listeners_task.cancel()
        try:
            await listeners_task
        except asyncio.CancelledError:
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='GATT BLE server status')
    parser.add_argument('--poll', type=int, default=None, help='Atualiza o status a cada N segundos (se omitido, mostra apenas uma vez)')
    args = parser.parse_args()

    try:
        asyncio.run(main(poll=args.poll))
    except KeyboardInterrupt:
        print("Servidor encerrado pelo usuário")
    except Exception as e:
        print(f"Erro inesperado: {e}")
