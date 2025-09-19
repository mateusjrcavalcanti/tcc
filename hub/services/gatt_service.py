from dbus_next.service import ServiceInterface, method, dbus_property, PropertyAccess
from constants import APP_PATH


class GattService(ServiceInterface):
    def __init__(self, uuid):
        super().__init__('org.bluez.GattService1')
        self._uuid = uuid

    @dbus_property(access=PropertyAccess.READ)
    def UUID(self) -> 's':  # type: ignore
        return self._uuid

    @dbus_property(access=PropertyAccess.READ)
    def Primary(self) -> 'b':  # type: ignore
        return True


class GattCharacteristic(ServiceInterface):
    def __init__(self, uuid, service_path, name, read_func=None, write_func=None):
        super().__init__('org.bluez.GattCharacteristic1')
        self.uuid = uuid
        self.service_path = service_path
        self.name = name
        self.read_func = read_func
        self.write_func = write_func

    @dbus_property(access=PropertyAccess.READ)
    def UUID(self) -> 's':  # type: ignore
        return self.uuid

    @dbus_property(access=PropertyAccess.READ)
    def Service(self) -> 'o':  # type: ignore
        return self.service_path

    @dbus_property(access=PropertyAccess.READ)
    def Flags(self) -> 'as':  # type: ignore
        flags = []
        if self.read_func:
            flags.append('read')
        if self.write_func:
            flags.append('write')
        return flags

    @method()
    async def ReadValue(self, options: 'a{sv}') -> 'ay':  # type: ignore
        if self.read_func:
            value = self.read_func()
            return [ord(c) for c in value]
        return []

    @method()
    async def WriteValue(self, value: 'ay', options: 'a{sv}'):  # type: ignore
        if self.write_func:
            text = ''.join([chr(b) for b in value])
            self.write_func(text)


def setup_gatt_service(bus, service_uuid, service_path, characteristics_data):
    service = GattService(service_uuid)
    bus.export(service_path, service)
    characteristics = []
    char_paths = []
    for data in characteristics_data:
        char_path = f"{service_path}/{data['name']}"
        char = GattCharacteristic(data['uuid'], service_path, data['name'], data.get('read_func'), data.get('write_func'))
        bus.export(char_path, char)
        characteristics.append(char)
        char_paths.append(char_path)
    return service, characteristics, char_paths
