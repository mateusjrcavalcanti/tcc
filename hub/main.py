import os
import sys
import argparse
import asyncio
from pathlib import Path
from dbus_next.aio import MessageBus
from dbus_next import Variant, BusType
from gatt_server import register_gatt_application
from constants import SHARED_DIR, BASE_DIR, ADAPTER_PATH, DEVICE_NAME

async def setup_advertising(bus):
    # Configurar advertising Bluetooth LE
    introspect = await bus.introspect('org.bluez', ADAPTER_PATH)
    adapter_obj = bus.get_proxy_object('org.bluez', ADAPTER_PATH, introspect)
    adapter_props = adapter_obj.get_interface('org.freedesktop.DBus.Properties')

    # Habilitar descoberta e pareamento
    await adapter_props.call_set('org.bluez.Adapter1', 'Discoverable', Variant('b', True))
    await adapter_props.call_set('org.bluez.Adapter1', 'DiscoverableTimeout', Variant('u', 0))  # Sem timeout
    await adapter_props.call_set('org.bluez.Adapter1', 'Pairable', Variant('b', True))

    print("Bluetooth advertising enabled - device is discoverable")


async def print_bluetooth_status(bus):
    """Coleta propriedades do adaptador BlueZ e conta dispositivos conectados, imprimindo no terminal."""
    try:
        # Introspect adapter and get properties
        introspect = await bus.introspect('org.bluez', ADAPTER_PATH)
        adapter_obj = bus.get_proxy_object('org.bluez', ADAPTER_PATH, introspect)
        props = adapter_obj.get_interface('org.freedesktop.DBus.Properties')

        # Ler propriedades básicas
        alias = await props.call_get('org.bluez.Adapter1', 'Alias')
        address = await props.call_get('org.bluez.Adapter1', 'Address')
        powered = await props.call_get('org.bluez.Adapter1', 'Powered')
        discoverable = await props.call_get('org.bluez.Adapter1', 'Discoverable')
        pairable = await props.call_get('org.bluez.Adapter1', 'Pairable')

        # Contar dispositivos conectados: usar ObjectManager para listar objetos e verificar Device1 Connected
        obj_manager = bus.get_proxy_object('org.bluez', '/', await bus.introspect('org.bluez', '/'))
        manager_iface = obj_manager.get_interface('org.freedesktop.DBus.ObjectManager')
        objects = await manager_iface.call_get_managed_objects()

        connected_count = 0
        paired_count = 0
        connected_names = []
        paired_names = []
        for obj_path, interfaces in objects.items():
            # interfaces é um dict-like: {interface_name: {prop: Variant(...)}}
            if 'org.bluez.Device1' in interfaces:
                dev_props = interfaces['org.bluez.Device1']
                # Some D-Bus Variant semantics: expect boolean under 'Connected'
                connected = False
                if 'Connected' in dev_props:
                    val = dev_props['Connected']
                    # If Variant(Wrapped) keep as Python bool or Variant
                    try:
                        connected = bool(val.value)
                    except Exception:
                        connected = bool(val)
                if connected:
                    connected_count += 1
                    # tentar obter nome FriendlyName ou Name
                    name = None
                    if 'Name' in dev_props:
                        try:
                            name = dev_props['Name'].value
                        except Exception:
                            name = dev_props['Name']
                    elif 'Alias' in dev_props:
                        try:
                            name = dev_props['Alias'].value
                        except Exception:
                            name = dev_props['Alias']
                    if name:
                        connected_names.append(str(name))
                # contar se emparelhado
                if 'Paired' in dev_props:
                    try:
                        paired = bool(dev_props['Paired'].value)
                    except Exception:
                        paired = bool(dev_props['Paired'])
                    if paired:
                        paired_count += 1
                        # obter nome para a lista de pareados
                        pname = None
                        if 'Name' in dev_props:
                            try:
                                pname = dev_props['Name'].value
                            except Exception:
                                pname = dev_props['Name']
                        elif 'Alias' in dev_props:
                            try:
                                pname = dev_props['Alias'].value
                            except Exception:
                                pname = dev_props['Alias']
                        if pname:
                            paired_names.append(str(pname))

        # Retornar os valores para que a formatação/impressão seja feita por um único lugar
        return {
            'alias': alias.value if hasattr(alias, 'value') else alias,
            'address': address.value if hasattr(address, 'value') else address,
            'powered': powered.value if hasattr(powered, 'value') else powered,
            'discoverable': discoverable.value if hasattr(discoverable, 'value') else discoverable,
            'pairable': pairable.value if hasattr(pairable, 'value') else pairable,
            'connected_count': connected_count,
            'paired_count': paired_count,
            'connected_names': connected_names,
            'paired_names': paired_names,
        }

    except Exception as e:
        print(f"Erro ao obter status Bluetooth: {e}")
        return None


async def unpair_all_devices(bus):
    """Remove todos os dispositivos pareados do adaptador (chama Adapter1.RemoveDevice)."""
    try:
        # obter objetos gerenciados e adaptador proxy
        obj_manager = bus.get_proxy_object('org.bluez', '/', await bus.introspect('org.bluez', '/'))
        manager_iface = obj_manager.get_interface('org.freedesktop.DBus.ObjectManager')
        objects = await manager_iface.call_get_managed_objects()

        # adaptador proxy para chamar RemoveDevice
        introspect = await bus.introspect('org.bluez', ADAPTER_PATH)
        adapter_obj = bus.get_proxy_object('org.bluez', ADAPTER_PATH, introspect)
        adapter_iface = adapter_obj.get_interface('org.bluez.Adapter1')

        removed = 0
        for obj_path, interfaces in objects.items():
            if 'org.bluez.Device1' in interfaces:
                try:
                    # RemoveDevice espera o object path do dispositivo
                    await adapter_iface.call_remove_device(obj_path)
                    removed += 1
                except Exception as e:
                    print(f"Falha ao remover dispositivo {obj_path}: {e}")

        print(f"Despareados {removed} dispositivos (tentativa de limpeza)")
    except Exception as e:
        print(f"Erro ao tentar desparear dispositivos: {e}")


def print_status_summary(status, device_name, shared_dir):
    """Imprime um único bloco de logs resumido (evita duplicação)."""
    if status is None:
        print("Não foi possível obter o status do Bluetooth.")
        return

    print("\n--- Status do Bluetooth ---")
    # Usar device_name (DEVICE_NAME) como principal rótulo visível
    print(f"Dispositivo visível: {device_name}")
    print(f"Nome (Alias): {status.get('alias')}")
    print(f"Endereço: {status.get('address')}")
    print(f"Powered: {status.get('powered')}")
    print(f"Discoverable: {status.get('discoverable')}")
    print(f"Pairable: {status.get('pairable')}")
    print(f"Dispositivos conectados atualmente: {status.get('connected_count')}")
    print(f"Dispositivos pareados: {status.get('paired_count')}")
    # Listar nomes (se houver)
    cnames = status.get('connected_names') or []
    pnames = status.get('paired_names') or []
    if cnames:
        print("Nomes dos dispositivos conectados:")
        for n in cnames:
            print(f"  - {n}")
    else:
        print("Nomes dos dispositivos conectados: nenhum")

    if pnames:
        print("Nomes dos dispositivos pareados:")
        for n in pnames:
            print(f"  - {n}")
    else:
        print("Nomes dos dispositivos pareados: nenhum")
    print(f"Arquivos compartilhados em: {shared_dir}")
    print("---------------------------\n")

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

    # Obter status do adaptador Bluetooth e imprimir resumo consolidado (evita logs duplicados)
    if poll is None:
        status = await print_bluetooth_status(bus)
        print_status_summary(status, DEVICE_NAME, SHARED_DIR)

        # Manter o programa rodando
        await asyncio.Future()
    else:
        # Atualização periódica: limpar terminal e reimprimir o resumo a cada <poll> segundos
        try:
            while True:
                status = await print_bluetooth_status(bus)
                # limpar tela
                os.system('clear')
                print("Servidor GATT BLE pronto! Conecte pelo seu celular ou app BLE.")
                print_status_summary(status, DEVICE_NAME, SHARED_DIR)
                await asyncio.sleep(poll)
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
