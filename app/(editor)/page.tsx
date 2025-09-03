"use client";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home, Save, FolderOpen } from "lucide-react";

import BlocklyEditor from "@/blockly";
import { useRef } from "react";

export default function EditorPage() {
  // CodePanel now manages its own visibility internally
  const editorRef = useRef<{
    clear?: () => void;
    getCode?: () => string;
    subscribe?: (fn: (code: string) => void) => void;
    unsubscribe?: (fn: (code: string) => void) => void;
  } | null>(null);

  // no longer needed here; CodePanel subscribes directly via passed ref

  return (
    <div className="h-screen bg-[#282a36] text-[#f8f8f2] flex flex-col relative">
      {/* header */}
      <header className="bg-[#21222c] border-b border-[#44475a] px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-[#bd93f9] hover:text-[#f8f8f2] hover:bg-[#44475a] transition-colors p-2 rounded">
              <Home className="h-4 w-4" />
              <span className="text-sm">Home</span>
            </button>
            <button className="flex items-center gap-2 text-[#f8f8f2] hover:text-[#bd93f9]  hover:bg-[#44475a] transition-colors p-2 rounded">
              <Save className="h-4 w-4" />
              <span className="text-sm">Salvar</span>
            </button>
            <button className="flex items-center gap-2 text-[#f8f8f2] hover:text-[#bd93f9]  hover:bg-[#44475a] transition-colors p-2 rounded">
              <FolderOpen className="h-4 w-4" />
              <span className="text-sm">Abrir</span>
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#f8f8f2] hover:text-[#bd93f9]  hover:bg-[#44475a] transition-colors p-2 rounded gap-2"
              onClick={() => {
                try {
                  editorRef.current?.clear?.();
                } catch {
                  // fallback
                  localStorage.removeItem("mainWorkspace");
                  window.location.reload();
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Limpar
            </Button>
          </div>
          <div className="flex items-center gap-2"></div>
        </div>
      </header>

      {/* workspace */}
      <div className="flex flex-1 h-full overflow-hidden">
        <div className="bg-[#282a36] h-full min-h-0 min-w-0 transition-all duration-300 relative flex-1">
          <BlocklyEditor ref={editorRef} className="h-full w-full" />
          {/* Botão de código agora é gerenciado diretamente pelo Blockly (createCodeButton). */}
        </div>
      </div>
    </div>
  );
}
