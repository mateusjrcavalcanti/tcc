import os
import argparse
import asyncio
from dbus_next.aio import MessageBus
from dbus_next import Variant, BusType
from gatt_server import register_gatt_application
from constants import SHARED_DIR, ADAPTER_PATH, DEVICE_NAME
from bluetooth import setup_advertising, print_bluetooth_status, print_status_summary, unpair_all_devices, monitor_events


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
    registration_success = await register_gatt_application(bus)

    # Configurar advertising apenas se o registro GATT foi bem-sucedido
    if registration_success:
        await setup_advertising(bus)
    else:
        print("GATT registration failed, continuing without advertising")

    print("Servidor GATT BLE pronto! Conecte pelo seu celular ou app BLE.")

    # Iniciar monitor de eventos em segundo plano (detectar pair/connect)
    monitor_task = asyncio.create_task(monitor_events(bus, interval=1.0))

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
        monitor_task.cancel()
        try:
            await monitor_task
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
