"use client";
import BluetoothTopBar from "@/components/bluetooth-topbar";

export default function EditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <BluetoothTopBar />
      {children}
    </>
  );
}
