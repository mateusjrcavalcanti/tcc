import logging
import random
import time
import threading
from bluezero import peripheral, adapter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('CPU_GATT')

DEVICE_NAME = 'NotebookBLE'
CPU_TMP_SRVC = '12341000-1234-1234-1234-123456789abc'
CPU_TMP_CHRC = '12341001-1234-1234-1234-123456789abc'
CPU_FMT_DSCP = '2904'  # Characteristic Presentation Format descriptor

def read_value():
    cpu_value = random.randrange(3200, 5310, 10) / 100
    logger.info(f"Read temperature: {cpu_value:.2f}°C")
    # Convert to signed 16-bit integer in little-endian format
    return list(int(cpu_value * 100).to_bytes(2, byteorder='little', signed=True))

class TemperatureService:
    def __init__(self, characteristic):
        self.characteristic = characteristic
        self.notifying = False
        self.thread = None
        
    def start_notifying(self):
        if self.notifying:
            return
            
        self.notifying = True
        self.thread = threading.Thread(target=self._notification_worker)
        self.thread.daemon = True
        self.thread.start()
        
    def stop_notifying(self):
        self.notifying = False
        if self.thread:
            self.thread.join()
            self.thread = None
            
    def _notification_worker(self):
        while self.notifying:
            new_value = read_value()
            self.characteristic.set_value(new_value)
            logger.info(f"Notificação enviada: {new_value}")
            time.sleep(2)

def notify_callback(notifying, characteristic):
    # This will be called when a client enables/disables notifications
    if notifying:
        logger.info("Cliente habilitou notificações")
        # Start notification thread
        if not hasattr(characteristic, 'temp_service'):
            characteristic.temp_service = TemperatureService(characteristic)
        characteristic.temp_service.start_notifying()
    else:
        logger.info("Cliente desabilitou notificações")
        if hasattr(characteristic, 'temp_service'):
            characteristic.temp_service.stop_notifying()

def main():
    try:
        adapters = list(adapter.Adapter.available())
        if not adapters:
            logger.error("No Bluetooth adapter found")
            return
            
        adapter_obj = adapters[0]
        adapter_address = adapter_obj.address

        logger.info(f"Adapter address: {adapter_address}")
        logger.info(f"Device name: {DEVICE_NAME}")

        cpu_monitor = peripheral.Peripheral(
            adapter_address,
            local_name=DEVICE_NAME,
            appearance=0
        )

        # Add service
        cpu_monitor.add_service(srv_id=1, uuid=CPU_TMP_SRVC, primary=True)
        
        # Add characteristic
        cpu_monitor.add_characteristic(
            srv_id=1, chr_id=1, uuid=CPU_TMP_CHRC,
            value=read_value(),  # Initial value
            notifying=False,
            flags=['read', 'notify'],
            read_callback=read_value,
            write_callback=None,
            notify_callback=notify_callback
        )
        
        # Add descriptor for temperature format (Celsius, signed 16-bit integer, 0.01 units)
        # Format: [Format (1b), Exponent (1b), Unit (2b), Namespace (1b), Description (2b)]
        # Format: 0x16 = sint16 (signed 16-bit integer)
        # Exponent: 0xFE = -2 (value multiplied by 10^exponent)
        # Unit: 0x272F = Degrees Celsius (Bluetooth SIG defined)
        cpu_monitor.add_descriptor(
            srv_id=1, chr_id=1, dsc_id=1, uuid=CPU_FMT_DSCP,
            value=[0x16, 0xFE, 0x2F, 0x27, 0x01, 0x00, 0x00],
            flags=['read']
        )

        cpu_monitor.on_connect = lambda device: logger.info(f"Dispositivo conectado: {device}")
        cpu_monitor.on_disconnect = lambda device: logger.info(f"Dispositivo desconectado: {device}")

        cpu_monitor.publish()
        logger.info(f"{DEVICE_NAME} está anunciando e pronto para conexões.")

        # Keep the server running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Parando o GATT Server...")
            
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == '__main__':
    main()