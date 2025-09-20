import asyncio
import logging
import random
from bluezero import peripheral, adapter

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('CPU_GATT')

DEVICE_NAME = 'MyRaspiBLE'
CPU_TMP_SRVC = '12341000-1234-1234-1234-123456789abc'
CPU_TMP_CHRC = '2A6E'
CPU_FMT_DSCP = '2904'

def read_value():
    cpu_value = random.randrange(3200, 5310, 10) / 100
    logger.info(f"Read temperature: {cpu_value:.2f}°C")
    return list(int(cpu_value * 100).to_bytes(2, byteorder='little', signed=True))

async def notify_loop(characteristic):
    while characteristic.is_notifying:
        new_value = read_value()
        characteristic.set_value(new_value)
        logger.info(f"Notification sent: {new_value}")
        await asyncio.sleep(2)

def notify_callback(notifying, characteristic):
    if notifying:
        logger.info("Client enabled notifications")
        asyncio.create_task(notify_loop(characteristic))
    else:
        logger.info("Client disabled notifications")

def main():
    adapter_obj = list(adapter.Adapter.available())[0]
    adapter_address = adapter_obj.address

    logger.info(f"Adapter address: {adapter_address}")
    logger.info(f"Device name: {DEVICE_NAME}")

    cpu_monitor = peripheral.Peripheral(adapter_address,
                                        local_name=DEVICE_NAME,
                                        appearance=0)

    cpu_monitor.add_service(srv_id=1, uuid=CPU_TMP_SRVC, primary=True)
    cpu_monitor.add_characteristic(
        srv_id=1, chr_id=1, uuid=CPU_TMP_CHRC,
        value=[], notifying=False,
        flags=['read', 'notify'],
        read_callback=read_value,
        write_callback=None,
        notify_callback=notify_callback
    )
    cpu_monitor.add_descriptor(
        srv_id=1, chr_id=1, dsc_id=1, uuid=CPU_FMT_DSCP,
        value=[0x0E, 0xFE, 0x2F, 0x27, 0x01, 0x00, 0x00],
        flags=['read']
    )

    cpu_monitor.on_connect = lambda device: logger.info(f"Device connected: {device}")
    cpu_monitor.on_disconnect = lambda device: logger.info(f"Device disconnected: {device}")

    cpu_monitor.publish()
    logger.info(f"{DEVICE_NAME} está anunciando e pronto para conexões.")

    try:
        asyncio.get_event_loop().run_forever()
    except KeyboardInterrupt:
        logger.info("Parando o GATT Server...")

if __name__ == '__main__':
    main()
