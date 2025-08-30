"use client";

import React, { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

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
  const [visible, setVisible] = useState(false);
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
    <>
      {visible && (
        <div
          className={`w-96 flex-shrink-0 bg-[#21222c] border-l border-[#44475a] flex flex-col h-full animate-in slide-in-from-right duration-300 ${className}`}
        >
          <div className="bg-[#191a21] px-4 py-2 border-b border-[#44475a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5555]"></div>
              <div className="w-3 h-3 rounded-full bg-[#f1fa8c]"></div>
              <div className="w-3 h-3 rounded-full bg-[#50fa7b]"></div>
              <span className="ml-2 text-sm text-[#f8f8f2]">main.py</span>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="text-[#6272a4] hover:text-[#f8f8f2] transition-colors p-1 rounded hover:bg-[#44475a]"
              title="Ocultar painel de código"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <pre className="text-sm text-[#f8f8f2] font-mono leading-relaxed">
              {code ||
                "# Arraste blocos para gerar código Python aqui\n# O código aparecerá automaticamente"}
            </pre>
          </div>
        </div>
      )}

      {!visible && (
        <div className="absolute top-16 right-4 z-10">
          <button
            onClick={() => setVisible(true)}
            className="bg-[#44475a] hover:bg-[#6272a4] text-[#f8f8f2] p-2 rounded shadow-lg transition-colors"
            title="Mostrar painel de código"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
