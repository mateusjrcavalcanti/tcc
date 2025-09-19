from dbus_next.service import ServiceInterface, method
from dbus_next.aio import MessageBus
from dbus_next import Variant


class Agent(ServiceInterface):
    def __init__(self, path='/org/bluez/example/agent'):
        super().__init__('org.bluez.Agent1')
        self.path = path

    @method()
    def Release(self):
        print('Agent released')

    @method()
    def RequestPinCode(self, device) -> 's':  # type: ignore
        print(f'RequestPinCode for {device}, returning default PIN 0000')
        return '0000'

    @method()
    def DisplayPinCode(self, device, pincode):
        print(f'DisplayPinCode {pincode} for {device}')

    @method()
    def RequestPasskey(self, device) -> 'u':  # type: ignore
        print(f'RequestPasskey for {device}, returning 000000')
        return 0

    @method()
    def DisplayPasskey(self, device, passkey, entered):
        print(f'DisplayPasskey {passkey} (entered={entered}) for {device}')

    @method()
    def RequestConfirmation(self, device, passkey):
        print(f'RequestConfirmation {passkey} for {device} - auto-confirming')
        # Auto-confirm: apenas retorna sem erro
        return

    @method()
    def AuthorizeService(self, device, uuid):
        print(f'AuthorizeService {uuid} @ {device} - auto-authorized')
        return

    @method()
    def Cancel(self):
        print('Agent canceled')


async def register_agent(bus: MessageBus, capability: str = 'KeyboardDisplay'):
    path = '/org/bluez/example/agent'
    agent = Agent(path)
    bus.export(path, agent)

    # Registrar agent no AgentManager1
    introspect = await bus.introspect('org.bluez', '/')
    manager_obj = bus.get_proxy_object('org.bluez', '/', introspect)
    try:
        agent_manager = manager_obj.get_interface('org.bluez.AgentManager1')
    except Exception as e:
        print(f'AgentManager1 não disponível: {e}')
        return None

    try:
        await agent_manager.call_register_agent(path, capability)
        # Tornar o agent padrão
        try:
            await agent_manager.call_request_default_agent(path)
        except Exception:
            # fallback: algumas versões usam RegisterDefaultAgent
            try:
                await agent_manager.call_register_default_agent(path)
            except Exception:
                pass
        print('Agent registrado e definido como default')
        return agent
    except Exception as e:
        print(f'Falha ao registrar agent: {e}')
        return None


async def unregister_agent(bus: MessageBus, agent):
    if agent is None:
        return
    try:
        introspect = await bus.introspect('org.bluez', '/')
        manager_obj = bus.get_proxy_object('org.bluez', '/', introspect)
        agent_manager = manager_obj.get_interface('org.bluez.AgentManager1')
        try:
            await agent_manager.call_unregister_agent(agent.path)
        except Exception:
            pass
    except Exception as e:
        print(f'Erro ao desregistrar agent: {e}')
    try:
        bus.unexport(agent.path)
    except Exception:
        pass
