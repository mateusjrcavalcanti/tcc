import * as Blockly from "blockly/core";

const WIDTH = 48;
const HEIGHT = 48;
const MARGIN_VERTICAL = 16;
const MARGIN_HORIZONTAL = 16;

type CodeButtonOptions = {
  topOffset?: number;
  rightOffset?: number;
  weight?: number;
  getCode?: () => string;
};

export class CodeButton {
  private workspace_: Blockly.WorkspaceSvg;
  private svgGroup_: SVGGElement | null = null;
  private initialized_ = false;
  private top_ = 0;
  private left_ = 0;
  private modal: HTMLDivElement | null = null;
  private preRef: HTMLPreElement | null = null;
  private topOffset_ = MARGIN_VERTICAL;
  private rightOffset_ = MARGIN_HORIZONTAL;
  private weight_ = 3;
  private escHandler_: ((e: KeyboardEvent) => void) | null = null;

  id = "codeButton";

  constructor(workspace: Blockly.WorkspaceSvg, opts: CodeButtonOptions = {}) {
    this.workspace_ = workspace;
    if (typeof opts.topOffset === "number") this.topOffset_ = opts.topOffset;
    if (typeof opts.rightOffset === "number")
      this.rightOffset_ = opts.rightOffset;
    if (typeof opts.weight === "number") this.weight_ = opts.weight;
    this.getCode = opts.getCode;
  }
  private getCode?: () => string;

  createDom(): SVGElement {
    this.svgGroup_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.G,
      { class: "blocklyCodeButton" },
      null
    );

    // botão arredondado (círculo) - rx/ry igual a metade da altura
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.RECT,
      {
        width: WIDTH,
        height: HEIGHT,
        rx: HEIGHT / 2,
        ry: HEIGHT / 2,
        fill: "#1f2937",
      },
      this.svgGroup_
    );

    // rótulo centralizado (ícone maior)
    const label = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.TEXT,
      {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        fill: "#f8f8f2",
        "font-size": "20px",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      },
      this.svgGroup_
    );
    label.textContent = "<>";

    this.svgGroup_.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openModal();
    });

    return this.svgGroup_;
  }

  init(hideIcon?: boolean, weight?: number) {
    if (!hideIcon) {
      this.workspace_.getComponentManager().addComponent({
        component: this,
        weight: typeof weight === "number" ? weight : this.weight_,
        capabilities: [Blockly.ComponentManager.Capability.POSITIONABLE],
      });
    }
    // garantir que o SVG do botão esteja no DOM do workspace
    try {
      if (!this.svgGroup_) {
        const parent = this.workspace_.getParentSvg();
        if (parent) {
          const g = this.createDom();
          parent.appendChild(g);
        }
      }
    } catch {}
    this.initialized_ = true;
    this.workspace_.resize();
  }

  dispose() {
    this.closeModal();
    this.workspace_.getComponentManager().removeComponent(this.id);
    if (this.svgGroup_) Blockly.utils.dom.removeNode(this.svgGroup_);
  }

  getBoundingRectangle(): Blockly.utils.Rect | null {
    const bottom = this.top_ + HEIGHT;
    const right = this.left_ + WIDTH;
    return new Blockly.utils.Rect(this.top_, bottom, this.left_, right);
  }

  position(
    metrics: Blockly.MetricsManager.UiMetrics,
    savedPositions: Blockly.utils.Rect[]
  ) {
    if (!this.initialized_) return;

    // Forçar posição no canto superior direito
    const cornerPosition = {
      horizontal: Blockly.uiPosition.horizontalPosition.RIGHT,
      vertical: Blockly.uiPosition.verticalPosition.TOP,
    } as const;
    const startRect = Blockly.uiPosition.getStartPositionRect(
      cornerPosition,
      new Blockly.utils.Size(WIDTH, HEIGHT),
      // usar offsets customizados (right/top)
      this.rightOffset_ ?? MARGIN_HORIZONTAL,
      this.topOffset_ ?? MARGIN_VERTICAL,
      metrics,
      this.workspace_
    );

    // posicionamento lateral (direita -> esquerda)
    const SPACING = 8;
    // alinhar verticalmente ao topo do primeiro componente já salvo (garante mesma linha)
    const posTop = startRect.top;
    let posLeft = startRect.left;
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of savedPositions) {
        if (!(posTop + HEIGHT <= r.top || posTop >= r.bottom)) {
          if (posLeft < r.right && posLeft + WIDTH > r.left) {
            posLeft = r.left - SPACING - WIDTH;
            changed = true;
          }
        }
      }
    }

    this.top_ = posTop;
    this.left_ = posLeft;

    if (this.svgGroup_) {
      this.svgGroup_.setAttribute(
        "transform",
        `translate(${this.left_},${this.top_})`
      );
    }
  }

  private openModal() {
    if (this.modal) this.closeModal();

    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.5)";
    // toque de overlay do shadcn (leve blur)
    overlay.style.backdropFilter = "blur(2px)";
    overlay.style.zIndex = "999";

    const panel = document.createElement("div");
    panel.style.position = "absolute";
    panel.style.top = "64px";
    panel.style.left = "50%";
    panel.style.transform = "translateX(-50%)";
    panel.style.width = "min(800px, 90%)";
    panel.style.maxHeight = "calc(100vh - 64px)";
    panel.style.background = "#1c1d24"; // levemente mais escuro, estilo dialog
    panel.style.color = "#e5e7eb";
    panel.style.border = "1px solid #2a2b33"; // borda sutil
    panel.style.borderRadius = "12px"; // raio maior como shadcn dialog
    panel.style.boxShadow = "0 20px 48px rgba(0,0,0,0.45)";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";

    // header
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.padding = "10px 12px";
    header.style.background = "#16171d";
    header.style.borderBottom = "1px solid #2a2b33";

    // grupo do lado esquerdo: 3 controles coloridos + título
    const leftGroup = document.createElement("div");
    leftGroup.style.display = "flex";
    leftGroup.style.alignItems = "center";
    leftGroup.style.gap = "10px";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "8px";

    const makeDot = (color: string) => {
      const dot = document.createElement("span");
      dot.style.display = "inline-block";
      dot.style.width = "12px";
      dot.style.height = "12px";
      dot.style.borderRadius = "50%";
      dot.style.background = color;
      dot.style.boxShadow = "inset 0 0 0 1px rgba(0,0,0,0.25)";
      return dot;
    };
    controls.appendChild(makeDot("#ef4444")); // vermelho
    controls.appendChild(makeDot("#f59e0b")); // amarelo
    controls.appendChild(makeDot("#10b981")); // verde

    const title = document.createElement("span");
    title.textContent = "main.py";
    title.style.fontSize = "13px";
    title.style.color = "#cbd5e1";

    leftGroup.appendChild(controls);
    leftGroup.appendChild(title);
    header.appendChild(leftGroup);

    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.alignItems = "center";
    btns.style.gap = "8px";
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copiar";
    // estilo shadcn button secundário
    const styleButton = (b: HTMLButtonElement) => {
      b.style.padding = "6px 10px";
      b.style.fontSize = "12px";
      b.style.borderRadius = "6px";
      b.style.border = "1px solid #2f3038";
      b.style.background = "#0b0c10";
      b.style.color = "#e5e7eb";
      b.style.cursor = "pointer";
    };
    styleButton(copyBtn);
    copyBtn.onclick = async () => {
      try {
        const code = this.getCode?.() ?? "";
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = "Copiado!";
        setTimeout(() => (copyBtn.textContent = "Copiar"), 1200);
      } catch {}
    };
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Fechar";
    styleButton(closeBtn);
    closeBtn.onclick = () => this.closeModal();
    btns.appendChild(copyBtn);
    btns.appendChild(closeBtn);
    header.appendChild(btns);

    // body
    const body = document.createElement("div");
    body.style.padding = "12px";
    body.style.overflow = "auto";
    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.style.fontFamily =
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    pre.style.fontSize = "13px";
    pre.style.lineHeight = "1.6";
    pre.style.color = "#e2e8f0";
    pre.textContent =
      this.getCode?.() ??
      "# Arraste blocos para gerar código Python aqui\n# O código aparecerá automaticamente";
    this.preRef = pre;
    body.appendChild(pre);

    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);

    const parent = this.workspace_.getParentSvg()
      ?.parentNode as HTMLElement | null;
    if (parent) parent.appendChild(overlay);
    this.modal = overlay;

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeModal();
    });

    // ESC para fechar
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") this.closeModal();
    };
    window.addEventListener("keydown", onKeyDown, { once: true });
    this.escHandler_ = onKeyDown;
  }

  private closeModal() {
    if (this.modal) {
      if (this.escHandler_) {
        try {
          window.removeEventListener("keydown", this.escHandler_);
        } catch {}
        this.escHandler_ = null;
      }
      if (this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
    }
  }
}

Blockly.Css.register(`
.blocklyCodeButton, .blocklyCodeButton * { cursor: pointer; }
.blocklyCodeButton>rect { stroke: #374151; }
.blocklyCodeButton:hover>rect { fill: #374151; }
`);

/**
 * Fábrica para criar e gerenciar o CodeButton de forma simples.
 * Retorna um objeto com { init, dispose }.
 */
export function createCodeButton(
  workspace: Blockly.Workspace,
  opts: CodeButtonOptions = {}
) {
  let instance: CodeButton | null = null;
  return {
    init() {
      try {
        // o workspace retornado por Blockly.inject é um WorkspaceSvg em runtime
        instance = new CodeButton(
          workspace as unknown as Blockly.WorkspaceSvg,
          opts
        );
        instance.init(false, opts.weight);
      } catch {}
    },
    dispose() {
      try {
        instance?.dispose();
      } catch {}
      instance = null;
    },
  };
}
