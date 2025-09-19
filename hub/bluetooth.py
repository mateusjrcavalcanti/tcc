import os
import asyncio
from dbus_next.aio import MessageBus
from dbus_next import Variant
from dbus_next import BusType
from constants import SHARED_DIR, ADAPTER_PATH, DEVICE_NAME


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
    """Coleta propriedades do adaptador BlueZ e conta dispositivos conectados, retornando um dict com dados."""
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
            if 'org.bluez.Device1' in interfaces:
                dev_props = interfaces['org.bluez.Device1']
                # Some D-Bus Variant semantics: expect boolean under 'Connected'
                connected = False
                if 'Connected' in dev_props:
                    val = dev_props['Connected']
                    try:
                        connected = bool(val.value)
                    except Exception:
                        connected = bool(val)
                if connected:
                    connected_count += 1
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


def print_status_summary(status, device_name, shared_dir):
    """Imprime um único bloco de logs resumido (evita duplicação)."""
    if status is None:
        print("Não foi possível obter o status do Bluetooth.")
        return

    print("\n--- Status do Bluetooth ---")
    print(f"Dispositivo visível: {device_name}")
    print(f"Nome (Alias): {status.get('alias')}")
    print(f"Endereço: {status.get('address')}")
    print(f"Powered: {status.get('powered')}")
    print(f"Discoverable: {status.get('discoverable')}")
    print(f"Pairable: {status.get('pairable')}")
    print(f"Dispositivos conectados atualmente: {status.get('connected_count')}")
    print(f"Dispositivos pareados: {status.get('paired_count')}")
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


async def unpair_all_devices(bus):
    """Remove todos os dispositivos pareados do adaptador (chama Adapter1.RemoveDevice)."""
    try:
        obj_manager = bus.get_proxy_object('org.bluez', '/', await bus.introspect('org.bluez', '/'))
        manager_iface = obj_manager.get_interface('org.freedesktop.DBus.ObjectManager')
        objects = await manager_iface.call_get_managed_objects()

        introspect = await bus.introspect('org.bluez', ADAPTER_PATH)
        adapter_obj = bus.get_proxy_object('org.bluez', ADAPTER_PATH, introspect)
        adapter_iface = adapter_obj.get_interface('org.bluez.Adapter1')

        removed = 0
        for obj_path, interfaces in objects.items():
            if 'org.bluez.Device1' in interfaces:
                try:
                    await adapter_iface.call_remove_device(obj_path)
                    removed += 1
                except Exception as e:
                    print(f"Falha ao remover dispositivo {obj_path}: {e}")

        print(f"Despareados {removed} dispositivos (tentativa de limpeza)")
    except Exception as e:
        print(f"Erro ao tentar desparear dispositivos: {e}")


async def monitor_events(bus, interval: float = 1.0):
    """Monitora mudanças em dispositivos pareados/conectados por polling e imprime eventos no terminal.

    Usa polling simples (chamada a print_bluetooth_status) para detectar alterações nas listas de nomes.
    """
    prev_connected = set()
    prev_paired = set()
    while True:
        try:
            status = await print_bluetooth_status(bus)
            if status is None:
                await asyncio.sleep(interval)
                continue

            curr_connected = set(status.get('connected_names') or [])
            curr_paired = set(status.get('paired_names') or [])

            # Novos dispositivos conectados
            for name in sorted(curr_connected - prev_connected):
                print(f"[evento] Dispositivo conectado: {name}")

            # Dispositivos desconectados
            for name in sorted(prev_connected - curr_connected):
                print(f"[evento] Dispositivo desconectado: {name}")

            # Novos dispositivos pareados
            for name in sorted(curr_paired - prev_paired):
                print(f"[evento] Dispositivo pareado: {name}")

            # Dispositivos despareados
            for name in sorted(prev_paired - curr_paired):
                print(f"[evento] Dispositivo despareado: {name}")

            prev_connected = curr_connected
            prev_paired = curr_paired

        except Exception as e:
            print(f"Erro no monitor de eventos Bluetooth: {e}")

        await asyncio.sleep(interval)
