"use client";
import BluetoothDialogWrapper from "@/components/bluetooth-dialog-wrapper";

export default function EditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <BluetoothDialogWrapper />
    </>
  );
}
