// Tipagens mínimas para a Web Bluetooth API usadas pelo projeto
export {};

declare global {
  type BluetoothServiceUUID = number | string | BluetoothUUID;
  type BluetoothCharacteristicUUID = number | string | BluetoothUUID;

  interface BluetoothUUID {
    toString(): string;
  }

  interface RequestDeviceFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }

  interface RequestDeviceOptions {
    filters?: RequestDeviceFilter[];
    acceptAllDevices?: boolean;
    optionalServices?: BluetoothServiceUUID[];
  }

  interface Bluetooth {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
    // getAvailability? experimental, não necessário por ora
  }

  interface BluetoothDevice {
    id?: string;
    name?: string | null;
    gatt?: BluetoothRemoteGATTServer | null;
    // Eventos e outras APIs
    addEventListener?(
      type: "gattserverdisconnected" | "gattserverconnected",
      listener: (ev: Event) => void
    ): void;
    removeEventListener?(
      type: "gattserverdisconnected" | "gattserverconnected",
      listener: (ev: Event) => void
    ): void;
  }

  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(
      service: BluetoothServiceUUID
    ): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    uuid: string;
    getCharacteristic(
      characteristic: BluetoothCharacteristicUUID
    ): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    uuid: string;
    value?: DataView | null;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(
      type: "characteristicvaluechanged",
      listener: (ev: Event) => void
    ): void;
    removeEventListener(
      type: "characteristicvaluechanged",
      listener: (ev: Event) => void
    ): void;
  }

  interface Navigator {
    bluetooth?: Bluetooth;
  }
}
