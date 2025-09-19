from managers.file_manager import FileManager
from constants import APP_PATH, ADAPTER_PATH
from services.file_service import file_gatt_service 
from services.wifi_service import wifi_gatt_service

async def register_gatt_application(bus):
    # Configurar serviço GATT
    service, characteristics, char_paths, service_path = await file_gatt_service(bus)
    
    # Imprimir informações dos serviços disponíveis (FileService)
    print(f"Serviço GATT registrado:")
    print(f"  Nome: FileService")
    print(f"  Path: {service_path}")
    print(f"  UUID: {service.UUID}")
    print("Características:")
    for char, path in zip(characteristics, char_paths):
        print(f"    Nome: {char.name}")
        print(f"    Path: {path}")
        print(f"    UUID: {char.UUID}\n")

    # Configurar e imprimir informações do WifiService
    wifi_service, wifi_characteristics, wifi_char_paths, wifi_service_path = await wifi_gatt_service(bus)
    print(f"Serviço GATT registrado:")
    print(f"  Nome: WifiService")
    print(f"  Path: {wifi_service_path}")
    print(f"  UUID: {wifi_service.UUID}")
    print("Características:")
    for char, path in zip(wifi_characteristics, wifi_char_paths):
        print(f"    Nome: {char.name}")
        print(f"    Path: {path}")
        print(f"    UUID: {char.UUID}\n")
    
    # Registrar aplicação GATT no gerenciador BlueZ do adaptador
    introspect = await bus.introspect('org.bluez', ADAPTER_PATH)
    adapter_obj = bus.get_proxy_object('org.bluez', ADAPTER_PATH, introspect)

    # Check if GattManager1 interface is available
    interfaces = [iface.name for iface in introspect.interfaces]
    if 'org.bluez.GattManager1' not in interfaces:
        print("GattManager1 interface not available on this adapter")
        return False

    gatt_manager = adapter_obj.get_interface('org.bluez.GattManager1')

    options = {}

    try:
        await gatt_manager.call_register_application(APP_PATH, options)
        print("GATT application registered successfully")
        # Retornar também os UUIDs dos serviços para uso em advertisement
        service_uuids = []
        try:
            service_uuids.append(str(service.UUID))
        except Exception:
            pass
        try:
            service_uuids.append(str(wifi_service.UUID))
        except Exception:
            pass
        return True, service_uuids
    except Exception as e:
        print(f"Failed to register GATT application: {e}")
        return False, []
