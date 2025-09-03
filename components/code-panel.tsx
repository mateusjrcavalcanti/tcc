"use client";

import React, { useEffect, useState } from "react";
import { FileCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type EditorRef = {
  getCode?: () => string;
  subscribe?: (fn: (code: string) => void) => void;
  unsubscribe?: (fn: (code: string) => void) => void;
} | null;

type Props = {
  editorRef?: React.RefObject<EditorRef>;
  className?: string;
};

export default function CodePanel({ editorRef, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    const handler = (c: string) => setCode(c);
    const cur = editorRef?.current as EditorRef | undefined;
    try {
      // subscribe if available
      cur?.subscribe?.(handler);
    } catch {}
    // initial fetch
    try {
      const initial = cur?.getCode?.() ?? "";
      setCode(initial);
    } catch {}
    return () => {
      try {
        cur?.unsubscribe?.(handler);
      } catch {}
    };
  }, [editorRef]);

  return (
    <div className={className}>
      {/* Botão flutuante abaixo do botão de Bluetooth (que está ancorado em top-right) */}
      <div className="absolute right-4 z-20" style={{ top: 72 }}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className="bg-[#1f2937] hover:bg-[#374151] text-[#f8f8f2] px-3 py-2 rounded-md shadow-lg transition-colors flex items-center gap-2"
              title="Ver código gerado"
            >
              <FileCode className="h-4 w-4" />
              Código
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] bg-[#21222c] text-[#f8f8f2] border border-[#44475a]">
            <DialogHeader>
              <DialogTitle>main.py</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto">
              <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {code ||
                  "# Arraste blocos para gerar código Python aqui\n# O código aparecerá automaticamente"}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
