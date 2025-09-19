import asyncio
from dbus_next.aio import MessageBus
from dbus_next import Variant
from dbus_next.service import ServiceInterface, method, signal
from dbus_next.constants import BusType

BLUEZ_SERVICE_NAME = 'org.bluez'
ADAPTER_PATH = '/org/bluez/hci0'
DEVICE_NAME = 'PythonBLE-Notifier'

# ---------------- Características ----------------
class HelloWorldCharacteristic(ServiceInterface):
    UUID = '12345678-1234-5678-1234-56789abcdef0'
    def __init__(self, path):
        super().__init__('com.example.HelloWorldCharacteristic')
        self.path = path

    @method()
    def ReadValue(self) -> 'ay': # type: ignore
        msg = "Hello World"
        print("HelloWorld lido:", msg)
        return [Variant('y', ord(c)) for c in msg]

class PingPongCharacteristic(ServiceInterface):
    UUID = '12345678-1234-5678-1234-56789abcdef1'
    def __init__(self, path):
        super().__init__('com.example.PingPongCharacteristic')
        self.path = path

    @method()
    def ReadValue(self) -> 'ay': # type: ignore
        msg = "Pong"
        print("PingPong lido:", msg)
        return [Variant('y', ord(c)) for c in msg]

class MessageCharacteristic(ServiceInterface):
    UUID = 'abcdef01-1234-5678-1234-56789abcdef0'
    def __init__(self, path):
        super().__init__('com.example.MessageCharacteristic')
        self.path = path
        self.message = "Mensagem padrão"
        self.subscribed = False

    @method()
    def ReadValue(self) -> 'ay': # type: ignore
        return [Variant('y', ord(c)) for c in self.message]

    @method()
    def WriteValue(self, value: 'ay'): # type: ignore
        self.message = "".join([chr(v.value) for v in value])
        print("Mensagem atualizada para:", self.message)
        if self.subscribed:
            self.PropertiesChanged({'Value': [Variant('y', ord(c)) for c in self.message]})

    @method()
    def StartNotify(self):
        self.subscribed = True
        print("Notificação iniciada para Message")

    @method()
    def StopNotify(self):
        self.subscribed = False
        print("Notificação parada para Message")

    @signal()
    def PropertiesChanged(self, changed: 'a{sv}'): # type: ignore
        pass

# ---------------- Serviços ----------------
class ChecagemService(ServiceInterface):
    UUID = '12345678-1234-5678-1234-56789abcdeff'
    def __init__(self, path):
        super().__init__('com.example.ChecagemService')
        self.path = path
        self.hello_char = HelloWorldCharacteristic(path + '/hello')
        self.ping_char = PingPongCharacteristic(path + '/ping')

class MensagemService(ServiceInterface):
    UUID = 'abcdef01-1234-5678-1234-56789abcdef1'
    def __init__(self, path):
        super().__init__('com.example.MensagemService')
        self.path = path
        self.message_char = MessageCharacteristic(path + '/message')

# ---------------- Aplicação GATT ----------------
class Application(ServiceInterface):
    def __init__(self, path='/com/example/application'):
        super().__init__('org.bluez.GattApplication1')
        self.path = path
        self.services = []

    def add_service(self, service):
        self.services.append(service)

    @method()
    def GetManagedObjects(self):
        objects = {}
        for service in self.services:
            objects[service.path] = service.get_properties()
            for char in [getattr(service, 'hello_char', None),
                         getattr(service, 'ping_char', None),
                         getattr(service, 'message_char', None)]:
                if char:
                    objects[char.path] = char.get_properties()
        return objects

# ---------------- Registro de serviços ----------------
async def register_services(bus):
    introspect = await bus.introspect(BLUEZ_SERVICE_NAME, ADAPTER_PATH)
    adapter_obj = bus.get_proxy_object(BLUEZ_SERVICE_NAME, ADAPTER_PATH, introspect)
    gatt_manager = adapter_obj.get_interface('org.bluez.GattManager1')

    app = Application()

    checagem = ChecagemService(app.path + '/service_checagem')
    mensagem = MensagemService(app.path + '/service_mensagem')

    app.add_service(checagem)
    app.add_service(mensagem)

    # Exporta aplicação, serviços e características
    bus.export(app.path, app)
    bus.export(checagem.path, checagem)
    bus.export(checagem.hello_char.path, checagem.hello_char)
    bus.export(checagem.ping_char.path, checagem.ping_char)
    bus.export(mensagem.path, mensagem)
    bus.export(mensagem.message_char.path, mensagem.message_char)

    await gatt_manager.call_register_application(app.path, {})
    print("Serviços BLE registrados: Checagem e Mensagem (com notificação)")

# ---------------- Advertising ----------------
async def start_advertising(bus):
    introspect = await bus.introspect(BLUEZ_SERVICE_NAME, ADAPTER_PATH)
    adapter_obj = bus.get_proxy_object(BLUEZ_SERVICE_NAME, ADAPTER_PATH, introspect)
    ad_manager = adapter_obj.get_interface('org.bluez.LEAdvertisingManager1')

    ad_path = '/com/example/advertisement0'
    class Advertisement(ServiceInterface):
        def __init__(self, path):
            super().__init__('org.bluez.LEAdvertisement1')
            self.path = path

        @method()
        def Release(self):
            print("Advertising liberado")

        @method()
        def GetProperties(self):
            return {
                'Type': 'peripheral',
                'LocalName': DEVICE_NAME,
                'ServiceUUIDs': [
                    ChecagemService.UUID,
                    MensagemService.UUID
                ]
            }

    advertisement = Advertisement(ad_path)
    bus.export(ad_path, advertisement)
    await ad_manager.call_register_advertisement(ad_path, {})
    print(f"Advertising iniciado, dispositivo visível como '{DEVICE_NAME}'.")

# ---------------- Main ----------------
async def main():
    bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
    await register_services(bus)
    await start_advertising(bus)
    print("Aguardando conexões BLE... Pressione Ctrl+C para sair.")
    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
