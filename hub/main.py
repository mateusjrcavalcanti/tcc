#!/usr/bin/env python3
import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
from gi.repository import GLib

BLUEZ_SERVICE_NAME = 'org.bluez'
ADAPTER_IFACE = 'org.bluez.Adapter1'
GATT_MANAGER_IFACE = 'org.bluez.GattManager1'
LE_ADVERTISING_MANAGER_IFACE = 'org.bluez.LEAdvertisingManager1'

DEVICE_NAME = 'PythonBLE-Notifier'

MAIN_LOOP = None

# ---------------- Características ----------------
class Characteristic(dbus.service.Object):
    def __init__(self, bus, path, uuid, flags, service):
        self.path = path
        self.bus = bus
        self.uuid = uuid
        self.flags = flags
        self.service = service
        self.notifying = False
        self.value = []
        dbus.service.Object.__init__(self, bus, path)

    @dbus.service.method('org.bluez.GattCharacteristic1', in_signature='', out_signature='ay')
    def ReadValue(self):
        print(f"{self.uuid} ReadValue")
        return self.value

    @dbus.service.method('org.bluez.GattCharacteristic1', in_signature='ay', out_signature='')
    def WriteValue(self, value):
        print(f"{self.uuid} WriteValue: {bytes(value).decode()}")
        self.value = value
        if self.notifying:
            self.PropertiesChanged({'Value': self.value})

    @dbus.service.method('org.bluez.GattCharacteristic1')
    def StartNotify(self):
        print(f"{self.uuid} StartNotify")
        self.notifying = True

    @dbus.service.method('org.bluez.GattCharacteristic1')
    def StopNotify(self):
        print(f"{self.uuid} StopNotify")
        self.notifying = False

    @dbus.service.signal('org.freedesktop.DBus.Properties', signature='a{sv}')
    def PropertiesChanged(self, changed):
        pass

# ---------------- Serviços ----------------
class Service(dbus.service.Object):
    def __init__(self, bus, path, uuid, primary=True):
        self.path = path
        self.bus = bus
        self.uuid = uuid
        self.primary = primary
        self.characteristics = []
        dbus.service.Object.__init__(self, bus, path)

    def add_characteristic(self, characteristic):
        self.characteristics.append(characteristic)

# ---------------- Aplicação ----------------
class Application(dbus.service.Object):
    def __init__(self, bus):
        self.path = '/'
        self.services = []
        self.bus = bus
        dbus.service.Object.__init__(self, bus, self.path)

    def add_service(self, service):
        self.services.append(service)

    @dbus.service.method('org.freedesktop.DBus.ObjectManager', out_signature='a{oa{sa{sv}}}')
    def GetManagedObjects(self):
        managed_objects = {}
        for service in self.services:
            managed_objects[service.path] = {
                'org.bluez.GattService1': {
                    'UUID': service.uuid,
                    'Primary': service.primary
                }
            }
            for char in service.characteristics:
                managed_objects[char.path] = {
                    'org.bluez.GattCharacteristic1': {
                        'UUID': char.uuid,
                        'Flags': char.flags
                    }
                }
        return managed_objects

# ---------------- Main ----------------
def main():
    global MAIN_LOOP
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()

    app = Application(bus)

    # Serviço Checagem
    checagem = Service(bus, '/com/example/service_checagem', '12345678-1234-5678-1234-56789abcdeff')
    hello_char = Characteristic(bus, checagem.path + '/hello', '12345678-1234-5678-1234-56789abcdef0', ['read'], checagem)
    hello_char.value = [dbus.Byte(ord(c)) for c in "Hello World"]
    ping_char = Characteristic(bus, checagem.path + '/ping', '12345678-1234-5678-1234-56789abcdef1', ['read'], checagem)
    ping_char.value = [dbus.Byte(ord(c)) for c in "Pong"]
    checagem.add_characteristic(hello_char)
    checagem.add_characteristic(ping_char)
    app.add_service(checagem)

    # Serviço Mensagem
    mensagem = Service(bus, '/com/example/service_mensagem', 'abcdef01-1234-5678-1234-56789abcdef1')
    message_char = Characteristic(bus, mensagem.path + '/message', 'abcdef01-1234-5678-1234-56789abcdef0', ['read', 'write', 'notify'], mensagem)
    message_char.value = [dbus.Byte(ord(c)) for c in "Mensagem padrão"]
    mensagem.add_characteristic(message_char)
    app.add_service(mensagem)

    # Registrar GATT
    adapter_path = '/org/bluez/hci0'
    adapter_obj = bus.get_object(BLUEZ_SERVICE_NAME, adapter_path)
    gatt_manager = dbus.Interface(adapter_obj, GATT_MANAGER_IFACE)
    gatt_manager.RegisterApplication(app.path, {}, reply_handler=lambda: print("GATT Application registrada!"),
                                     error_handler=lambda e: print("Erro:", e))

    MAIN_LOOP = GLib.MainLoop()
    print("Servidor BLE rodando...")
    MAIN_LOOP.run()

if __name__ == '__main__':
    main()
