import os
import asyncio
from dbus_next.aio import MessageBus
from dbus_next import Variant
from dbus_next import BusType
from dbus_next.service import (ServiceInterface, method, dbus_property, PropertyAccess)
from dbus_next.aio import MessageBus
import uuid
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
                # inicializar variáveis por dispositivo
                name = None
                address = None
                # Extrair address e name/alias
                if 'Address' in dev_props:
                    try:
                        address = dev_props['Address'].value
                    except Exception:
                        address = dev_props['Address']

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
                    if name:
                        connected_names.append(str(name) + f" ({address})" if address else str(name))

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
                            paired_names.append(str(pname) + f" ({address})" if address else str(pname))

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


async def start_event_listeners(bus):
    """Instala listeners D-Bus para eventos de Bluetooth (InterfacesAdded, InterfacesRemoved e PropertiesChanged).

    Esta função registra callbacks que imprimem eventos no terminal quando dispositivos se conectam,
    desconectam, pareiam ou despareiam. Usa org.freedesktop.DBus.ObjectManager para descobrir objetos
    existentes e conectar handlers PropertiesChanged para cada Device1.
    """
    obj = bus.get_proxy_object('org.bluez', '/', await bus.introspect('org.bluez', '/'))
    manager = obj.get_interface('org.freedesktop.DBus.ObjectManager')

    # estado local dos dispositivos por path -> {'connected': bool, 'paired': bool, 'name': str}
    device_state = {}

    # Helper para extrair campo string de um possible Variant
    def _get_str(v):
        try:
            return v.value
        except Exception:
            return v

    # Handler assíncrono para quando novas interfaces são adicionadas
    def on_interfaces_added(path, interfaces):
        # schedule async task to handle introspection
        asyncio.create_task(_handle_interfaces_added(path, interfaces))

    async def _handle_interfaces_added(path, interfaces):
        if 'org.bluez.Device1' not in interfaces:
            return

        props = interfaces['org.bluez.Device1']
        name = None
        if 'Name' in props:
            name = _get_str(props['Name'])
        elif 'Alias' in props:
            name = _get_str(props['Alias'])
        address = None
        if 'Address' in props:
            address = _get_str(props['Address'])

        connected = False
        if 'Connected' in props:
            try:
                connected = bool(props['Connected'].value)
            except Exception:
                connected = bool(props['Connected'])

        paired = False
        if 'Paired' in props:
            try:
                paired = bool(props['Paired'].value)
            except Exception:
                paired = bool(props['Paired'])

        display_name = name or address or path
        # imprimir eventos iniciais se necessário, incluindo MAC quando disponível
        if connected:
            print(f"[evento] Dispositivo conectado: {display_name} ({address})")
        if paired:
            print(f"[evento] Dispositivo pareado: {display_name} ({address})")

        # Exportar proxy do dispositivo e ligar PropertiesChanged
        try:
            introspect = await bus.introspect('org.bluez', path)
            dev_obj = bus.get_proxy_object('org.bluez', path, introspect)
            props_iface = dev_obj.get_interface('org.freedesktop.DBus.Properties')

            def on_properties_changed(interface, changed, invalidated):
                # interface é a interface cujo properties mudaram
                if interface != 'org.bluez.Device1':
                    return

                # Extrair Nome
                n = None
                if 'Name' in changed:
                    try:
                        n = changed['Name'].value
                    except Exception:
                        n = changed['Name']

                # Conexão
                if 'Connected' in changed:
                    try:
                        new_connected = bool(changed['Connected'].value)
                    except Exception:
                        new_connected = bool(changed['Connected'])
                    prev = device_state.get(path, {}).get('connected')
                    if prev is None:
                        # primeiro estado observado
                        pass
                    elif new_connected and not prev:
                        print(f"[evento] Dispositivo conectado: {n or display_name} ({address})")
                    elif not new_connected and prev:
                        print(f"[evento] Dispositivo desconectado: {n or display_name} ({address})")
                    device_state.setdefault(path, {})['connected'] = new_connected

                # Pareado
                if 'Paired' in changed:
                    try:
                        new_paired = bool(changed['Paired'].value)
                    except Exception:
                        new_paired = bool(changed['Paired'])
                    prevp = device_state.get(path, {}).get('paired')
                    if prevp is None:
                        pass
                    elif new_paired and not prevp:
                        print(f"[evento] Dispositivo pareado: {n or display_name} ({address})")
                    elif not new_paired and prevp:
                        print(f"[evento] Dispositivo despareado: {n or display_name} ({address})")
                    device_state.setdefault(path, {})['paired'] = new_paired

            props_iface.on_properties_changed(on_properties_changed)

            # inicializar estado
            device_state.setdefault(path, {})['connected'] = connected
            device_state.setdefault(path, {})['paired'] = paired

        except Exception as e:
            print(f"Erro ao iniciar listener para {path}: {e}")

    # InterfacesRemoved handler
    def on_interfaces_removed(path, interfaces):
        if 'org.bluez.Device1' in interfaces:
            # dispositivo removido - pode ser despareado
            prev = device_state.pop(path, None)
            name = path
            if prev and prev.get('paired'):
                print(f"[evento] Dispositivo despareado (removido): {name}")

    # Registra handlers
    manager.on_interfaces_added(on_interfaces_added)
    manager.on_interfaces_removed(on_interfaces_removed)

    # Conectar handlers para dispositivos já existentes
    try:
        objects = await manager.call_get_managed_objects()
        for obj_path, interfaces in objects.items():
            if 'org.bluez.Device1' in interfaces:
                # chamar handler para inicializar e conectar properties
                await _handle_interfaces_added(obj_path, interfaces)
    except Exception as e:
        print(f"Erro ao inicializar listeners de dispositivos existentes: {e}")

    print('Event listeners D-Bus instalados (InterfacesAdded/Removed + PropertiesChanged)')



class Advertisement(ServiceInterface):
    """Implementation minimalista de org.bluez.LEAdvertisement1 para registro do advertisement.

    Note: BlueZ espera um objeto exportado no DBus que implemente
    org.bluez.LEAdvertisement1 com os métodos Release e a propriedade Type.
    Esta classe exporta o necessário.
    """

    def __init__(self, path: str, adv_type: str = 'peripheral', service_uuids=None, local_name=None):
        super().__init__('org.bluez.LEAdvertisement1')
        self.path = path
        self._type = adv_type
        self.service_uuids = service_uuids or []
        self.local_name = local_name

    @dbus_property(access=PropertyAccess.READ)
    def Type(self) -> 's':  # type: ignore
        return self._type

    @dbus_property(access=PropertyAccess.READ)
    def ServiceUUIDs(self) -> 'as':  # type: ignore
        return self.service_uuids

    @dbus_property(access=PropertyAccess.READ)
    def LocalName(self) -> 's':  # type: ignore
        return self.local_name or ''

    @method()
    def Release(self) -> None:
        print('Advertisement released by BlueZ')


async def register_advertisement(bus: MessageBus, adapter_path: str, service_uuids=None, local_name=None):
    """Cria e registra um objeto LEAdvertisement1 no bus do sistema.

    Retorna o objeto advertisement e o proxy para o manager usado para registrar.
    """
    try:
        # Cria um caminho único para o advertisement
        adv_path = f"{adapter_path}/adv{uuid.uuid4().hex[:8]}"

        # Exportar o objeto no bus
        advertisement = Advertisement(adv_path, adv_type='peripheral', service_uuids=service_uuids, local_name=local_name)
        bus.export(advertisement.path, advertisement)

        # Obter o manager LEAdvertisingManager1 no adaptador
        introspect = await bus.introspect('org.bluez', adapter_path)
        adapter_obj = bus.get_proxy_object('org.bluez', adapter_path, introspect)

        # Verificar se a interface LEAdvertisingManager1 está disponível
        interfaces = [iface.name for iface in introspect.interfaces]
        if 'org.bluez.LEAdvertisingManager1' not in interfaces:
            print('LEAdvertisingManager1 não disponível neste adaptador; não foi possível registrar advertisement')
            try:
                bus.unexport(advertisement.path)
            except Exception:
                pass
            return None, None

        adv_manager = adapter_obj.get_interface('org.bluez.LEAdvertisingManager1')

        # Montar options vazias
        options = {}

        # Registrar (tentar com opções mínimas, e em caso de falha tentar incluir Type)
        print('Attempting register_advertisement with options:', options)
        try:
            await adv_manager.call_register_advertisement(advertisement.path, options)
            print(f'Registered LE Advertisement at {advertisement.path} (no options)')
            return advertisement, adv_manager
        except Exception:
            import traceback
            print('Initial register_advertisement failed, trying with explicit Type option...')
            traceback.print_exc()
            # Tentar novamente passando a opção Type (algumas versões do BlueZ esperam isso)
            try:
                options2 = {'Type': 'peripheral'}
                print('Attempting register_advertisement with options:', options2)
                await adv_manager.call_register_advertisement(advertisement.path, options2)
                print(f'Registered LE Advertisement at {advertisement.path} (with Type option)')
                return advertisement, adv_manager
            except Exception:
                print('Second attempt failed; dumping traceback:')
                traceback.print_exc()
                try:
                    bus.unexport(advertisement.path)
                except Exception:
                    pass
                return None, None
        return advertisement, adv_manager

    except Exception:
        import traceback
        print('Erro inesperado ao tentar registrar advertisement:')
        traceback.print_exc()
        return None, None


async def unregister_advertisement(bus: MessageBus, advertisement, adv_manager):
    try:
        if adv_manager and advertisement:
            await adv_manager.call_unregister_advertisement(advertisement.path)
            print('Unregistered LE Advertisement')
        # remover export do objeto no bus
        try:
            bus.unexport(advertisement.path)
        except Exception:
            pass
    except Exception as e:
        print(f'Erro ao desregistrar advertisement: {e}')
