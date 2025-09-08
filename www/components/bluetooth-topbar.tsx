"use client";

import React from "react";
import { useBluetooth } from "../app/bluetooth-context";

export default function BluetoothTopBar() {
  const { device, connect, disconnect, status, error, clearError } =
    useBluetooth();
  const connected =
    status === "connected" ||
    !!(device && device.gatt && device.gatt.connected);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.5rem 1rem",
        background: connected ? "#0f172a" : "#1f2937",
        color: "white",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: connected
              ? "#10b981"
              : status === "requesting"
              ? "#f59e0b"
              : "#ef4444",
          }}
        />
        <span style={{ fontWeight: 600 }}>
          {status === "requesting"
            ? "Procurando dispositivo..."
            : connected
            ? `Conectado: ${device?.name ?? device?.id ?? "dispositivo"}`
            : "Desconectado"}
        </span>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#fecaca" }}>{error}</span>
              <button
                onClick={clearError}
                style={{ background: "transparent", color: "white" }}
              >
                OK
              </button>
            </div>
          )}

          {connected ? (
            <button
              onClick={disconnect}
              style={{ padding: "0.4rem 0.75rem", borderRadius: 6 }}
            >
              Desconectar
            </button>
          ) : (
            <button
              onClick={connect}
              style={{ padding: "0.4rem 0.75rem", borderRadius: 6 }}
              disabled={status === "requesting" || status === "unsupported"}
            >
              {status === "requesting" ? "Procurando..." : "Conectar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
