"use client";
import { Button } from "@/components/ui/button";
import {
  Play,
  Download,
  RotateCcw,
  Home,
  Save,
  FolderOpen,
} from "lucide-react";

import BlocklyEditor from "@/blockly";
import CodePanel from "@/components/code-panel";
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
            <button className="flex items-center gap-2 text-[#bd93f9] hover:text-[#f8f8f2] transition-colors p-2 rounded">
              <Home className="h-4 w-4" />
              <span className="text-sm">Home</span>
            </button>
            <button className="flex items-center gap-2 text-[#f8f8f2] hover:text-[#bd93f9] transition-colors p-2 rounded">
              <Save className="h-4 w-4" />
              <span className="text-sm">Salvar</span>
            </button>
            <button className="flex items-center gap-2 text-[#f8f8f2] hover:text-[#bd93f9] transition-colors p-2 rounded">
              <FolderOpen className="h-4 w-4" />
              <span className="text-sm">Abrir</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#f8f8f2] hover:bg-[#44475a] gap-2"
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
            <Button
              size="sm"
              className="bg-[#bd93f9] text-[#282a36] hover:bg-[#bd93f9]/90 gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar
            </Button>
            <Button className="bg-[#50fa7b] text-[#282a36] hover:bg-[#50fa7b]/90 gap-2">
              <Play className="h-4 w-4" />
              Executar
            </Button>
          </div>
        </div>
      </header>

      {/* workspace */}
      <div className="flex flex-1 h-full overflow-hidden">
        <div className="bg-[#282a36] h-full min-h-0 min-w-0 transition-all duration-300 relative flex-1">
          <BlocklyEditor ref={editorRef} className="h-full w-full" />
        </div>
        <CodePanel editorRef={editorRef} className="" />
      </div>
    </div>
  );
}
