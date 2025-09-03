import * as Blockly from "blockly/core";
import { pythonGenerator } from "blockly/python";

const WIDTH = 48;
const HEIGHT = 48;
const MARGIN_VERTICAL = 20;
const MARGIN_HORIZONTAL = 20;

type PlayButtonOptions = {
  onExecute?: (code: string) => void;
  iconUrl?: string;
  topOffset?: number;
  rightOffset?: number;
  weight?: number;
};

export class PlayButton {
  private workspace_: Blockly.WorkspaceSvg;
  private svgGroup_: SVGGElement | null = null;
  private initialized_ = false;
  private top_ = 0;
  private left_ = 0;
  private topOffset_ = 12; // alinhar ao restante dos botões por padrão
  private rightOffset_ = MARGIN_HORIZONTAL;
  private weight_ = 4; // abaixo do Bluetooth (5) e acima do CodeButton (3)

  id = "playButton";

  constructor(
    workspace: Blockly.WorkspaceSvg,
    private opts: PlayButtonOptions = {}
  ) {
    this.workspace_ = workspace;
    if (typeof opts.topOffset === "number") this.topOffset_ = opts.topOffset;
    if (typeof opts.rightOffset === "number")
      this.rightOffset_ = opts.rightOffset;
    if (typeof opts.weight === "number") this.weight_ = opts.weight;
  }

  createDom(): SVGElement {
    this.svgGroup_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.G,
      { class: "blocklyPlayButton" },
      null
    );

    // fundo
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.RECT,
      {
        width: WIDTH,
        height: HEIGHT,
        rx: HEIGHT / 2, // circular
        ry: HEIGHT / 2,
        fill: "#50fa7b",
        stroke: "#2aa561",
      },
      this.svgGroup_
    );

    if (this.opts.iconUrl) {
      // ícone via image
      Blockly.utils.dom.createSvgElement(
        Blockly.utils.Svg.IMAGE,
        {
          href: this.opts.iconUrl,
          x: 8,
          y: 8,
          width: 32,
          height: 32,
          style: "pointer-events:none",
        },
        this.svgGroup_
      );
    } else {
      // triângulo play
      const points = [
        [16, 14],
        [16, 34],
        [34, 24],
      ]
        .map((p) => p.join(","))
        .join(" ");
      Blockly.utils.dom.createSvgElement(
        Blockly.utils.Svg.POLYGON,
        { points, fill: "#1f2937" },
        this.svgGroup_
      );
    }

    // click handler
    this.svgGroup_.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const code = pythonGenerator.workspaceToCode(this.workspace_);
        if (this.opts.onExecute) this.opts.onExecute(code);
        else {
          if (!code || !code.trim()) alert("Nenhum código gerado.");
          else {
            const blob = new Blob([code], { type: "text/x-python" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao gerar código Python: " + String(err));
      }
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
    // garantir DOM
    try {
      if (!this.svgGroup_) {
        const parent = this.workspace_.getParentSvg();
        if (parent) parent.appendChild(this.createDom());
      }
    } catch {}
    this.initialized_ = true;
    this.workspace_.resize();
  }

  dispose() {
    try {
      this.workspace_.getComponentManager().removeComponent(this.id);
    } catch {}
    if (this.svgGroup_) Blockly.utils.dom.removeNode(this.svgGroup_);
    this.svgGroup_ = null;
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
      this.rightOffset_ ?? MARGIN_HORIZONTAL,
      this.topOffset_ ?? MARGIN_VERTICAL,
      metrics,
      this.workspace_
    );

    // posicionamento lateral: tentar colocar ao lado (para a esquerda) de itens já salvos
    const SPACING = 8;
    const posTop = startRect.top;
    let posLeft = startRect.left;

    // iterativamente, se houver colisão vertical com um savedPosition que ocupa espaço
    // na mesma faixa, shift para esquerda desse savedPosition até não colidir
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of savedPositions) {
        // checa sobreposição vertical
        if (!(posTop + HEIGHT <= r.top || posTop >= r.bottom)) {
          // se houver interseção horizontal também, deslocar para a esquerda do r
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
}

/**
 * Fábrica compatível com a anterior, agora usando ComponentManager.
 */
export function createPlayButton(
  workspace: Blockly.Workspace,
  opts: PlayButtonOptions = {}
) {
  let instance: PlayButton | null = null;
  return {
    init() {
      try {
        instance = new PlayButton(
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

Blockly.Css.register(`
.blocklyPlayButton>rect { cursor: pointer; }
.blocklyPlayButton:hover>rect { filter: brightness(0.95); }
`);
