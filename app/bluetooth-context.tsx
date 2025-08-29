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
        optionalServices: [], // Adicione serviços necessários aqui
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
  }, []);
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

  return (
    <BluetoothContext.Provider
      value={{ device, status, error, connect, disconnect, clearError }}
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
