from bluezero import peripheral, adapter
import time

DEVICE_NAME = 'MyRaspiBLE'

def main():
    adapter_address = list(adapter.Adapter.available())[0].address

    my_peripheral = peripheral.Peripheral(adapter_address,
                                          local_name=DEVICE_NAME,
                                          appearance=0)
    # Publica apenas o anúncio
    my_peripheral.publish()
    print(f"{DEVICE_NAME} está anunciando. Pressione Ctrl+C para sair.")

    # Mantém o loop ativo
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Parando o anúncio...")

if __name__ == '__main__':
    main()
