"use client";

import * as React from "react";
import BluetoothDialog from "@/components/bluetooth-dialog";

export function BluetoothDialogWrapper() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onOpen = (ev: Event) => {
      try {
        setOpen(true);
      } catch {}
    };
    document.addEventListener("open-bluetooth-dialog", onOpen);
    return () => document.removeEventListener("open-bluetooth-dialog", onOpen);
  }, []);

  return <BluetoothDialog open={open} onOpenChange={setOpen} />;
}

export default BluetoothDialogWrapper;
