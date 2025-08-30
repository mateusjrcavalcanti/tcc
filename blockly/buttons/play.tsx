import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";

type Options = {
  onExecute?: (code: string) => void;
  // URL para um ícone (opcional). Se não fornecido, usa um triângulo simples via CSS.
  iconUrl?: string;
};

/**
 * Cria um botão "play" reutilizável dentro do workspace do Blockly.
 * - Gera código Python com o pythonGenerator e chama onExecute(code)
 * - Retorna { init(), dispose() }
 */
export function createPlayButton(
  workspace: Blockly.Workspace,
  opts: Options = {}
) {
  let buttonEl: HTMLDivElement | null = null;
  const onExecute = opts.onExecute;

  function createDom() {
    const el = document.createElement("div");
    el.className = "blockly-play-button";
    el.style.width = "44px";
    el.style.height = "44px";
    el.style.borderRadius = "8px";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.cursor = "pointer";
    el.style.background = "#50fa7b";
    el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
    el.title = "Executar (gerar código Python)";

    if (opts.iconUrl) {
      el.style.background = `url('${opts.iconUrl}') no-repeat center`;
      el.style.backgroundSize = "22px 22px";
    } else {
      // ícone play simples (triângulo) via CSS
      const tri = document.createElement("div");
      tri.style.width = "0";
      tri.style.height = "0";
      tri.style.borderLeft = "12px solid #282a36";
      tri.style.borderTop = "8px solid transparent";
      tri.style.borderBottom = "8px solid transparent";
      el.appendChild(tri);
    }

    el.addEventListener("click", () => {
      try {
        const code = pythonGenerator.workspaceToCode(workspace);
        if (onExecute) {
          try {
            onExecute(code);
          } catch (e) {
            // se callback falhar, entregar fallback
            console.error("play button onExecute error", e);
            alert("Erro ao executar o callback do Play: " + String(e));
          }
        } else {
          // comportamento padrão: mostrar o código em uma janela
          if (!code || !code.trim()) {
            alert("Nenhum código gerado.");
          } else {
            // abre em nova janela/aba com o código (apenas para debug)
            const blob = new Blob([code], { type: "text/x-python" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }
        }
      } catch (e) {
        console.error(e);
        alert("Erro ao gerar código Python: " + String(e));
      }
    });

    return el;
  }

  function position() {
    if (!buttonEl) return;
    try {
      // posicione no canto inferior direito do workspace pai
      buttonEl.style.position = "absolute";
      buttonEl.style.right = "16px";
      buttonEl.style.bottom = "16px";
      buttonEl.style.zIndex = "12";
    } catch {
      // ignore
    }
  }

  function init() {
    // workspace.getParentSvg não está tipado em TS; usar cast mais restrito
    const parent = (
      workspace as unknown as { getParentSvg?: () => SVGElement }
    ).getParentSvg?.()?.parentNode as HTMLElement | null;
    if (!parent) return;
    buttonEl = createDom();
    parent.appendChild(buttonEl);
    position();
    window.addEventListener("resize", position);
  }

  function dispose() {
    window.removeEventListener("resize", position);
    if (buttonEl && buttonEl.parentNode)
      buttonEl.parentNode.removeChild(buttonEl);
    buttonEl = null;
  }

  return { init, dispose };
}
