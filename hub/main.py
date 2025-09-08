from __future__ import annotations
from typing import Dict, Any, Optional
from pydbus import SystemBus
from gi.repository import GLib

class Agent:

    dbus = {
        'org.bluez.Agent1': ''
    }

    def Release(self):
        print("Agent.Release called")

    def RequestPinCode(self, device):
        print(f"RequestPinCode for {device}")
        return '0000'

    def DisplayPinCode(self, device, pincode):
        print(f"DisplayPinCode for {device}: {pincode}")

    def RequestPasskey(self, device):
        print(f"RequestPasskey for {device}")
        # Retornar int simples; evita dependência do módulo `dbus`.
        return 0

    def DisplayPasskey(self, device, passkey, entered):
        print(f"DisplayPasskey for {device}: {passkey} entered={entered}")

    def RequestConfirmation(self, device, passkey):
        print(f"RequestConfirmation for {device}: {passkey} - auto-aceitar")
        # Aceitar automaticamente
        return

    def RequestAuthorization(self, device):
        print(f"RequestAuthorization for {device} - auto-aceitar")
        return

    def AuthorizeService(self, device, uuid):
        print(f"AuthorizeService for {device} uuid={uuid} - auto-aceitar")
        return

    def Cancel(self):
        print("Agent.Cancel called")


BLUEZ_SERVICE = "org.bluez"
OBJECT_MANAGER_IFACE = "org.freedesktop.DBus.ObjectManager"
ADAPTER_IFACE = "org.bluez.Adapter1"
DEVICE_IFACE = "org.bluez.Device1"
PROPERTIES_IFACE = "org.freedesktop.DBus.Properties"


def get_managed_objects(bus: SystemBus) -> Dict[str, Dict[str, Dict[str, Any]]]:
    mngr = bus.get(BLUEZ_SERVICE, "/")
    return mngr.GetManagedObjects()


def get_first_adapter_path(bus: SystemBus) -> Optional[str]:
    objs = get_managed_objects(bus)
    for path, ifs in objs.items():
        if ADAPTER_IFACE in ifs:
            return path
    return None


def set_adapter_alias(bus: SystemBus, adapter_path: str, alias: str):
    try:
        props = bus.get(PROPERTIES_IFACE, adapter_path)
        props.Set(ADAPTER_IFACE, 'Alias', alias)
        print(f"Alias do adaptador definido para: {alias}")
    except Exception as e:
        print(f"Falha ao alterar alias do adaptador: {e}")


def any_device_connected(bus: SystemBus) -> bool:
    objs = get_managed_objects(bus)
    for path, ifs in objs.items():
        dev = ifs.get(DEVICE_IFACE)
        if dev and dev.get('Connected'):
            return True
    return False


def ensure_pairable_discoverable(bus: SystemBus, adapter_path: Optional[str]):
    if not adapter_path:
        print("Nenhum adaptador disponível para configurar discoverable/pairable.")
        return
    if any_device_connected(bus):
        print("Existe dispositivo conectado — não alterando estado de pairing/discovery.")
        return
    try:
        props = bus.get(PROPERTIES_IFACE, adapter_path)
        # tornar pareable e discoverable indefinidamente
        props.Set(ADAPTER_IFACE, 'Pairable', True)
        props.Set(ADAPTER_IFACE, 'Discoverable', True)
        props.Set(ADAPTER_IFACE, 'DiscoverableTimeout', 0)
        print("Adaptador configurado para Pairable/Discoverable (timeout=0).")
    except Exception as e:
        print(f"Falha ao configurar discoverable/pairable: {e}")

def main(argv=None):
    bus = SystemBus()
    # Ao iniciar: renomear adaptador para "Pi Zero 2W", verificar dispositivos conectados
    adapter_path = get_first_adapter_path(bus)
    if adapter_path:
        set_adapter_alias(bus, adapter_path, "Pi Zero 2W")
        ensure_pairable_discoverable(bus, adapter_path)
    else:
        print("Nenhum adaptador Bluetooth encontrado no sistema.")
    # Registrar um Agent simples para aceitar pairing automaticamente
    agent_path = "/org/bluez/agent_simple"
    agent = Agent()
    bus = SystemBus()
    # Exporta o agente no barramento
    bus.publish(agent_path, agent)
    try:
        mgr = bus.get(BLUEZ_SERVICE, "/org/bluez")
        # AgentManager1 interface
        am = mgr.AgentManager1
        am.RegisterAgent(agent_path, "NoInputNoOutput")
        am.RequestDefaultAgent(agent_path)
        print("Agent registrado como default (NoInputNoOutput). Aguardando pairing...")
    except Exception as e:
        print(f"Falha ao registrar agent: {e}")

    loop = GLib.MainLoop()
    try:
        loop.run()
    except KeyboardInterrupt:
        print("Encerrando agente...")
        try:
            am.UnregisterAgent(agent_path)
        except Exception:
            pass


if __name__ == "__main__":
    main()
