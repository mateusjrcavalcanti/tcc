from managers.file_manager import FileManager
from constants import BASE_DIR, APP_PATH
from services.gatt_service import setup_gatt_service


async def file_gatt_service(bus):
    service_uuid = "12345678-1234-5678-1234-56789abcdef0"
    service_path = f"{APP_PATH}/FileService"
    file_manager = FileManager(BASE_DIR)
    characteristics_data = [
        {'name': 'ListFiles', 'uuid': "12345678-1234-5678-1234-56789abcdef1", 'read_func': file_manager.list_files},
        {'name': 'CreateFile', 'uuid': "12345678-1234-5678-1234-56789abcdef2", 'write_func': file_manager.create_file},
        {'name': 'DeleteFile', 'uuid': "12345678-1234-5678-1234-56789abcdef3", 'write_func': file_manager.delete_file},
        {'name': 'ReadFile', 'uuid': "12345678-1234-5678-1234-56789abcdef4", 'read_func': file_manager.read_file_func, 'write_func': file_manager.read_file_set_filename},
        {'name': 'WriteFile', 'uuid': "12345678-1234-5678-1234-56789abcdef5", 'write_func': file_manager.write_file_func}
    ]
    service, characteristics, char_paths = setup_gatt_service(bus, service_uuid, service_path, characteristics_data)
    return service, characteristics, char_paths, service_path