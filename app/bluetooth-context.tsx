"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useEffect } from "react";
import { toast } from "sonner";

type BluetoothStatus =
  | "idle"
  | "requesting"
  | "connected"
  | "reconnecting"
  | "error"
  | "unsupported";

interface BluetoothContextType {
  device: BluetoothDevice | null;
  status: BluetoothStatus;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
  // new GATT helpers
  wifiSet: (ssid: string, psk?: string | null) => Promise<any>;
  storageList: (path?: string) => Promise<any>;
  storageRead: (path: string) => Promise<Uint8Array | string>;
  storageWrite: (path: string, base64Data: string, overwrite?: boolean) => Promise<any>;
  storageDelete: (path: string) => Promise<any>;
  storageMkdir: (path: string) => Promise<any>;
  scriptStart: (filename: string) => Promise<any>;
  scriptChunk: (base64Chunk: string) => Promise<any>;
  scriptRun: (path: string) => Promise<any>;
  wifiStatus: () => Promise<any>;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(
  undefined
);

export const BluetoothProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [status, setStatus] = useState<BluetoothStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const manualDisconnectRef = React.useRef(false);
  const reconnectingRef = React.useRef(false);

  // cache de characteristics por uuid
  const charCache = React.useRef<Map<string, BluetoothRemoteGATTCharacteristic>>(new Map());

  const GATT = React.useMemo(() => ({
    WIFI_SERVICE: "22345678-1234-5678-1234-56789abcde00",
    WIFI_SSID: "22345678-1234-5678-1234-56789abcde01",
    WIFI_PASS: "22345678-1234-5678-1234-56789abcde02",
    WIFI_STATUS: "22345678-1234-5678-1234-56789abcde03",

    SCRIPT_SERVICE: "32345678-1234-5678-1234-56789abcde00",
    SCRIPT_WRITE: "32345678-1234-5678-1234-56789abcde01",
    SCRIPT_STATUS: "32345678-1234-5678-1234-56789abcde02",
    SCRIPT_RUN: "32345678-1234-5678-1234-56789abcde03",

    FS_SERVICE: "42345678-1234-5678-1234-56789abcde00",
    FS_LIST: "42345678-1234-5678-1234-56789abcde01",
    FS_READ: "42345678-1234-5678-1234-56789abcde02",
    FS_WRITE: "42345678-1234-5678-1234-56789abcde03",
    FS_DELETE: "42345678-1234-5678-1234-56789abcde04",
    FS_MKDIR: "42345678-1234-5678-1234-56789abcde05",
  }), []);

  const connect = useCallback(async () => {
    try {
      // se estamos tentando reconectar, cancelar a marca de desconexão manual
      manualDisconnectRef.current = false;
      setStatus("requesting");
      setError(null);
      if (
        typeof navigator === "undefined" ||
        !navigator.bluetooth ||
        typeof navigator.bluetooth.requestDevice !== "function"
      ) {
        setStatus("unsupported");
        setError("Web Bluetooth API não suportada neste navegador.");
        return;
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          GATT.WIFI_SERVICE,
          GATT.SCRIPT_SERVICE,
          GATT.FS_SERVICE,
        ], // solicitar serviços usados
      });

      setDevice(device);
      // se conectado imediatamente, marque; caso contrário, ficará idle até conectar via GATT
      setStatus(device.gatt && device.gatt.connected ? "connected" : "idle");
      toast.success(
        `Dispositivo selecionado: ${device.name ?? device.id ?? "dispositivo"}`
      );
    } catch (err) {
      const e = err as unknown;
      // Usuário fechou o chooser / cancelou
      if (e && typeof e === "object" && e !== null && "name" in e) {
        const name = (e as { name?: unknown }).name;
        if (name === "NotFoundError" || name === "NotAllowedError") {
          setStatus("idle");
          const msg =
            name === "NotFoundError"
              ? "Seleção cancelada pelo usuário."
              : "Permissão negada.";
          setError(msg);
          toast.error(msg);
          return;
        }
      }

      let message = "";
      if (e && typeof e === "object" && e !== null && "message" in e) {
        message = String((e as { message?: unknown }).message);
      } else {
        message = String(e);
      }

      setStatus("error");
      setError(message);
      toast.error(message);
      console.error("Erro ao conectar ao Bluetooth:", err);
    }
  }, [GATT]);

  // tenta reconectar com retries exponenciais
  const attemptReconnect = React.useCallback(
    async (maxRetries = 3) => {
      if (!device || !device.gatt) return false;
      if (manualDisconnectRef.current) return false;
      reconnectingRef.current = true;
      setStatus("reconnecting");

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (manualDisconnectRef.current) break;
        try {
          // tenta conectar via GATT
          if (typeof device.gatt.connect === "function") {
            await device.gatt.connect();
          }

          // se conseguiu conectar
          if (device.gatt.connected) {
            setStatus("connected");
            setError(null);
            reconnectingRef.current = false;
            toast.success(
              `Reconectado: ${device?.name ?? device?.id ?? "dispositivo"}`
            );
            return true;
          }
        } catch {
          // falha na tentativa, vamos esperar e tentar novamente
        }

        // backoff exponencial (1s, 2s, 4s, ...) limitado a 30s
        const delay = Math.min(30000, 1000 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, delay));
      }

      reconnectingRef.current = false;
      setStatus("error");
      setError("Falha ao reconectar ao dispositivo após várias tentativas.");
      toast.error("Falha ao reconectar ao dispositivo após várias tentativas.");
      return false;
    },
    [device]
  );

  const disconnect = useCallback(() => {
    // desconexão manual — não tentar reconectar
    manualDisconnectRef.current = true;
    reconnectingRef.current = false;
    if (
      device &&
      device.gatt &&
      device.gatt.connected &&
      typeof device.gatt.disconnect === "function"
    ) {
      device.gatt.disconnect();
      setDevice(null);
      setStatus("idle");
      toast("Desconectado");
    }
  }, [device]);

  // Atualiza status quando o device dispara eventos GATT
  useEffect(() => {
    if (!device) return;

    const onConnected = () => {
      setStatus("connected");
      setError(null);
      toast.success(
        `Dispositivo conectado: ${device?.name ?? device?.id ?? "dispositivo"}`
      );
    };

    const onDisconnected = () => {
      setStatus("idle");
      toast.warning(
        `Dispositivo desconectado: ${
          device?.name ?? device?.id ?? "dispositivo"
        }`
      );
      // se não foi desconexão manual, tentar reconectar
      if (!manualDisconnectRef.current) {
        // tentar reconectar em background
        void attemptReconnect();
      }
    };

    // Preferir métodos se existirem, caso contrário usar addEventListener
    try {
      if (typeof device.addEventListener === "function") {
        device.addEventListener(
          "gattserverconnected",
          onConnected as EventListener
        );
        device.addEventListener(
          "gattserverdisconnected",
          onDisconnected as EventListener
        );
      }
    } catch {
      // ignore
    }

    return () => {
      try {
        if (typeof device.removeEventListener === "function") {
          device.removeEventListener(
            "gattserverconnected",
            onConnected as EventListener
          );
          device.removeEventListener(
            "gattserverdisconnected",
            onDisconnected as EventListener
          );
        }
      } catch {
        // ignore
      }
    };
  }, [device, attemptReconnect]);

  const clearError = useCallback(() => setError(null), []);

  // --- GATT helpers ---
  const ensureConnectedGatt = useCallback(async () => {
    if (!device) throw new Error("Nenhum dispositivo selecionado");
    if (!device.gatt) throw new Error("GATT não disponível neste dispositivo");
    if (!device.gatt.connected) {
      await device.gatt.connect();
    }
    return device.gatt;
  }, [device]);

  const getCharacteristic = useCallback(
    async (serviceUuid: string, charUuid: string) => {
      const cacheKey = `${serviceUuid}|${charUuid}`;
      const cached = charCache.current.get(cacheKey);
      if (cached) return cached;
      const gatt = await ensureConnectedGatt();
      const service = await gatt.getPrimaryService(serviceUuid);
      const characteristic = await service.getCharacteristic(charUuid);
      charCache.current.set(cacheKey, characteristic);
      return characteristic;
    },
    [ensureConnectedGatt]
  );

  const readTextFromChar = useCallback(async (serviceUuid: string, charUuid: string) => {
    const c = await getCharacteristic(serviceUuid, charUuid);
    const v = await c.readValue();
    const arr = new Uint8Array(v.buffer);
    // tentar decodificar como UTF-8; se falhar, retornar base64
    try {
      const decoded = new TextDecoder().decode(arr);
      return decoded;
    } catch {
      // fallback para base64
      const b64 = btoa(String.fromCharCode(...arr));
      return b64;
    }
  }, [getCharacteristic]);

  const writeToChar = useCallback(async (serviceUuid: string, charUuid: string, data: ArrayBuffer | Uint8Array) => {
    const c = await getCharacteristic(serviceUuid, charUuid);
    // garantir BufferSource (usamos Uint8Array)
    let buf: Uint8Array;
    if (data instanceof Uint8Array) buf = data;
    else if (data instanceof ArrayBuffer) buf = new Uint8Array(data);
    else buf = new Uint8Array((data as any).buffer as ArrayBuffer);
    // writeValue typing in some TS configs expects ArrayBuffer; cast to any to avoid lib mismatch
    await c.writeValue(buf as any);
  }, [getCharacteristic]);

  const writeJson = useCallback(async (serviceUuid: string, charUuid: string, obj: any) => {
    const s = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(s);
    await writeToChar(serviceUuid, charUuid, bytes);
  }, [writeToChar]);

  // small helper to convert base64 -> Uint8Array
  const base64ToUint8 = useCallback((b64: string) => {
    const bin = atob(b64);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }, []);

  // --- exposed APIs (WiFi / Storage / Script) ---
  const wifiSet = useCallback(async (ssid: string, psk?: string | null) => {
    // write SSID then passphrase (if provided)
    await writeToChar(GATT.WIFI_SERVICE, GATT.WIFI_SSID, new TextEncoder().encode(ssid));
    if (psk !== undefined && psk !== null) {
      await writeToChar(GATT.WIFI_SERVICE, GATT.WIFI_PASS, new TextEncoder().encode(psk));
    }
    // optional: read status
    try {
      const status = await readTextFromChar(GATT.WIFI_SERVICE, GATT.WIFI_STATUS);
      return status;
    } catch {
      return null;
    }
  }, [GATT, writeToChar, readTextFromChar]);

  const storageList = useCallback(async (path = "") => {
    // FS_LIST is a read characteristic; some implementations ignore path and always list root
    try {
      // if path provided, try writing to FS_READ first as many server implementations expect that
      if (path) {
        await writeJson(GATT.FS_SERVICE, GATT.FS_READ, { path });
      }
      const txt = await readTextFromChar(GATT.FS_SERVICE, GATT.FS_LIST);
      try {
        return JSON.parse(typeof txt === "string" ? txt : new TextDecoder().decode(txt as any));
      } catch {
        return txt;
      }
    } catch (e) {
      throw e;
    }
  }, [GATT, writeJson, readTextFromChar]);

  const storageRead = useCallback(async (path: string) => {
    // write {path} to FS_READ then read its value
    await writeJson(GATT.FS_SERVICE, GATT.FS_READ, { path });
    // read back
    const val = await getCharacteristic(GATT.FS_SERVICE, GATT.FS_READ).then(async (c) => {
      const v = await c.readValue();
      const arr = new Uint8Array(v.buffer);
      // tentar decodificar texto
      try {
        return new TextDecoder().decode(arr);
      } catch {
        return arr; // retornar bytes
      }
    });
    return val;
  }, [GATT, writeJson, getCharacteristic]);

  const storageWrite = useCallback(async (path: string, base64Data: string, overwrite = true) => {
    const payload = { path, data: base64Data, overwrite };
    await writeJson(GATT.FS_SERVICE, GATT.FS_WRITE, payload);
    // não há char dedicado para resposta; retornar ok quando escrita completar
    return { ok: true };
  }, [GATT, writeJson]);

  const storageDelete = useCallback(async (path: string) => {
    await writeJson(GATT.FS_SERVICE, GATT.FS_DELETE, { path });
    return { ok: true };
  }, [GATT, writeJson]);

  const storageMkdir = useCallback(async (path: string) => {
    await writeJson(GATT.FS_SERVICE, GATT.FS_MKDIR, { path });
    return { ok: true };
  }, [GATT, writeJson]);

  const scriptStart = useCallback(async (filename: string) => {
    // send JSON start header
    await writeJson(GATT.SCRIPT_SERVICE, GATT.SCRIPT_WRITE, { type: "start", filename });
    // read status char for session id
    const status = await readTextFromChar(GATT.SCRIPT_SERVICE, GATT.SCRIPT_STATUS);
    try {
      return JSON.parse(String(status));
    } catch {
      return status;
    }
  }, [GATT, writeJson, readTextFromChar]);

  const scriptChunk = useCallback(async (base64Chunk: string) => {
    const bytes = base64ToUint8(base64Chunk);
    await writeToChar(GATT.SCRIPT_SERVICE, GATT.SCRIPT_WRITE, bytes);
    // read status
    const status = await readTextFromChar(GATT.SCRIPT_SERVICE, GATT.SCRIPT_STATUS);
    try { return JSON.parse(String(status)); } catch { return status; }
  }, [GATT, base64ToUint8, writeToChar, readTextFromChar]);

  const scriptRun = useCallback(async (path: string) => {
    await writeToChar(GATT.SCRIPT_SERVICE, GATT.SCRIPT_RUN, new TextEncoder().encode(path));
    const status = await readTextFromChar(GATT.SCRIPT_SERVICE, GATT.SCRIPT_STATUS);
    try { return JSON.parse(String(status)); } catch { return status; }
  }, [GATT, writeToChar, readTextFromChar]);

  const wifiStatus = useCallback(async () => {
    const txt = await readTextFromChar(GATT.WIFI_SERVICE, GATT.WIFI_STATUS);
    try {
      return JSON.parse(typeof txt === "string" ? txt : new TextDecoder().decode(txt as any));
    } catch {
      return txt;
    }
  }, [GATT, readTextFromChar]);

  return (
    <BluetoothContext.Provider
      value={{
        device,
        status,
        error,
        connect,
        disconnect,
        clearError,
        // exposed helpers
        wifiSet,
        storageList,
        storageRead,
        storageWrite,
        storageDelete,
        storageMkdir,
        scriptStart,
        scriptChunk,
        scriptRun,
        wifiStatus,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = () => {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error(
      "useBluetooth deve ser usado dentro de um BluetoothProvider"
    );
  }
  return context;
};
