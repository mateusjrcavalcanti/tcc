"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBluetooth } from "@/app/bluetooth-context";

export function BluetoothDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const bt = useBluetooth();
  const [devicesInfo, setDevicesInfo] = React.useState<any | null>(null);
  const [wifiInfo, setWifiInfo] = React.useState<any | null>(null);
  const [files, setFiles] = React.useState<any[] | null>(null);
  const [loadingWifi, setLoadingWifi] = React.useState(false);
  const [loadingFiles, setLoadingFiles] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    // when opening, try to read some info from device if connected
    let mounted = true;
    (async () => {
      if (!bt.device || bt.status !== "connected") {
        setDevicesInfo(null);
        setWifiInfo(null);
        setFiles(null);
        return;
      }
      try {
        setError(null);
        setLoadingWifi(true);
        setLoadingFiles(true);
        // try reading wifi status and storage list in parallel
        const [w, f] = await Promise.all([
          bt.wifiStatus().catch(() => null),
          bt.storageList().catch(() => null),
        ]);
        if (!mounted) return;
        setDevicesInfo({ name: bt.device?.name, id: bt.device?.id, gattConnected: !!bt.device?.gatt?.connected });
        setWifiInfo(w ?? null);
        // storageList may return an object or array; normalize to array when possible
        if (Array.isArray(f)) setFiles(f as any[]);
        else if (f && typeof f === "object" && Array.isArray((f as any).files)) setFiles((f as any).files as any[]);
        else setFiles(null);
      } catch {
        if (!mounted) return;
        setDevicesInfo(null);
        setWifiInfo(null);
        setFiles(null);
        setError("Falha ao ler informações do dispositivo.");
      } finally {
        setLoadingWifi(false);
        setLoadingFiles(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, bt.device, bt.status]);

  const refreshWifi = async () => {
    try {
      setError(null);
      setLoadingWifi(true);
      const w = await bt.wifiStatus();
      setWifiInfo(w ?? null);
    } catch (e) {
      setError(String(e ?? "Erro ao obter wifiStatus"));
      setWifiInfo(null);
    } finally {
      setLoadingWifi(false);
    }
  };

  const listFiles = async (path = "") => {
    try {
      setError(null);
      setLoadingFiles(true);
      const f = await bt.storageList(path);
      if (Array.isArray(f)) setFiles(f as any[]);
      else if (f && typeof f === "object" && Array.isArray((f as any).files)) setFiles((f as any).files as any[]);
      else setFiles(null);
    } catch (e) {
      setError(String(e ?? "Erro ao listar arquivos"));
      setFiles(null);
    } finally {
      setLoadingFiles(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bluetooth</DialogTitle>
          <DialogDescription>
            {bt.status === "connected" ? "Conectado" : bt.status === "requesting" ? "Solicitando..." : bt.status}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {error && <div className="text-sm text-destructive">{error}</div>}
          {bt.status !== "connected" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Nenhum dispositivo conectado.</p>
              <div className="flex gap-2">
                <Button onClick={() => void bt.connect()}>Conectar</Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
              </div>
            </div>
          )}

          {bt.status === "connected" && (
            <div>
              <div className="mb-2">
                <strong className="block text-lg">{bt.device?.name ?? bt.device?.id ?? "Dispositivo"}</strong>
                <div className="text-sm text-muted-foreground">ID: {bt.device?.id}</div>
                <div className="text-sm text-muted-foreground">GATT: {bt.device?.gatt?.connected ? "conectado" : "desconectado"}</div>
              </div>

              <section className="mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Wi‑Fi</h4>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={refreshWifi} disabled={loadingWifi}>{loadingWifi ? "..." : "Atualizar"}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setWifiInfo(null)}>Limpar</Button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {loadingWifi && <div>Carregando...</div>}
                  {!loadingWifi && wifiInfo && (
                    typeof wifiInfo === "object" ? (
                      <div className="space-y-1">
                        {Object.entries(wifiInfo).map(([k, v]) => (
                          <div key={k}><strong>{k}:</strong> {String(v)}</div>
                        ))}
                      </div>
                    ) : (
                      <div>{String(wifiInfo)}</div>
                    )
                  )}
                  {!loadingWifi && !wifiInfo && <div className="text-sm text-muted-foreground">Sem informação Wi‑Fi disponível.</div>}
                </div>
              </section>

              <section className="mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Arquivos (FS)</h4>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void listFiles()} disabled={loadingFiles}>{loadingFiles ? "..." : "Listar"}</Button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {loadingFiles && <div>Carregando arquivos...</div>}
                  {!loadingFiles && files && files.length > 0 && (
                    <ul className="list-disc ml-5">
                      {files.map((f, i) => (
                        <li key={i}>{typeof f === "string" ? f : JSON.stringify(f)}</li>
                      ))}
                    </ul>
                  )}
                  {!loadingFiles && (!files || files.length === 0) && <div className="text-sm text-muted-foreground">Nenhum arquivo listado.</div>}
                </div>
              </section>

              <div className="flex gap-2">
                <Button onClick={() => bt.disconnect()}>Desconectar</Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose>
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BluetoothDialog;
