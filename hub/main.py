import os
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

async def main():
    bus = await MessageBus(bus_type=BusType.SYSTEM).connect()

    # Configurar adaptador Bluetooth
    introspect = await bus.introspect('org.bluez', ADAPTER_PATH)
    adapter = bus.get_proxy_object('org.bluez', ADAPTER_PATH, introspect)
    props_iface = adapter.get_interface('org.freedesktop.DBus.Properties')

    # Renomear adaptador e ligar
    await props_iface.call_set('org.bluez.Adapter1', 'Alias', Variant('s', DEVICE_NAME))
    await props_iface.call_set('org.bluez.Adapter1', 'Powered', Variant('b', True))

    # Registrar aplicação GATT
    registration_success = await register_gatt_application(bus)

    # Configurar advertising apenas se o registro GATT foi bem-sucedido
    if registration_success:
        await setup_advertising(bus)
    else:
        print("GATT registration failed, continuing without advertising")

    print("Servidor GATT BLE pronto! Conecte pelo seu celular ou app BLE.")
    print(f"Dispositivo visível como: {DEVICE_NAME}")
    print(f"Arquivos compartilhados em: {SHARED_DIR}")

    # Manter o programa rodando
    await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Servidor encerrado pelo usuário")
    except Exception as e:
        print(f"Erro inesperado: {e}")
