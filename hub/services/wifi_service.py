from constants import BASE_DIR, APP_PATH
from services.gatt_service import setup_gatt_service
from managers.wifi_manager import WifiManager


async def wifi_gatt_service(bus):
    service_uuid = "87654321-4321-6789-4321-0fedcba98765"
    service_path = f"{APP_PATH}/WifiService"
    wifi_manager = WifiManager()
    characteristics_data = [
        {'name': 'Scan', 'uuid': "87654321-4321-6789-4321-0fedcba98766", 'read_func': wifi_manager.scan},
        {'name': 'Status', 'uuid': "87654321-4321-6789-4321-0fedcba98767", 'read_func': wifi_manager.status},
        {'name': 'SetNetwork', 'uuid': "87654321-4321-6789-4321-0fedcba98768", 'write_func': wifi_manager.set_network},
        {'name': 'Disconnect', 'uuid': "87654321-4321-6789-4321-0fedcba98769", 'write_func': wifi_manager.disconnect}
    ]
    service, characteristics, char_paths = setup_gatt_service(bus, service_uuid, service_path, characteristics_data)
    return service, characteristics, char_paths, service_path
