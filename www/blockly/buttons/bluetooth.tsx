import * as Blockly from "blockly/core";

const WIDTH = 48;
const HEIGHT = 48;
const MARGIN_VERTICAL = 16;
const MARGIN_HORIZONTAL = 16;

type BluetoothButtonOptions = {
  topOffset?: number;
  rightOffset?: number;
  weight?: number;
  getStatus?: () => { status: string; deviceName?: string };
  onConnect?: () => Promise<void> | void;
  onDisconnect?: () => Promise<void> | void;
};

export class BluetoothButton {
  private workspace_: Blockly.WorkspaceSvg;
  private svgGroup_: SVGGElement | null = null;
  private initialized_ = false;
  private top_ = 0;
  private left_ = 0;
  private topOffset_ = MARGIN_VERTICAL;
  private rightOffset_ = MARGIN_HORIZONTAL;
  private weight_ = 5;
  private opts: BluetoothButtonOptions;

  id = "bluetoothButton";

  constructor(
    workspace: Blockly.WorkspaceSvg,
    opts: BluetoothButtonOptions = {}
  ) {
    this.workspace_ = workspace;
    this.opts = opts;
    if (typeof opts.topOffset === "number") this.topOffset_ = opts.topOffset;
    if (typeof opts.rightOffset === "number")
      this.rightOffset_ = opts.rightOffset;
    if (typeof opts.weight === "number") this.weight_ = opts.weight;
  }

  createDom(): SVGElement {
    this.svgGroup_ = Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.G,
      { class: "blocklyBluetoothButton" },
      null
    );

    // circle background
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.CIRCLE,
      {
        cx: WIDTH / 2,
        cy: HEIGHT / 2,
        r: HEIGHT / 2,
        fill: "#1f2937",
        stroke: "#374151",
      },
      this.svgGroup_
    );

    // small status dot (we'll update color in render)
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.CIRCLE,
      { cx: WIDTH - 10, cy: 10, r: 5, fill: "#6b7280", id: "bt-status" },
      this.svgGroup_
    );

    // ícone de robô (cabeça arredondada, olhos e antena)
    const headW = 16;
    const headH = 12;
    const headX = (WIDTH - headW) / 2;
    const headY = (HEIGHT - headH) / 2; // centraliza no eixo Y
    // cabeça (id para atualização de cor)
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.RECT,
      {
        x: headX,
        y: headY,
        width: headW,
        height: headH,
        rx: 3,
        ry: 3,
        fill: "#e5e7eb",
        stroke: "none",
        id: "bt-robot-head",
      },
      this.svgGroup_
    );
    // olhos (ids para atualização se necessário)
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.CIRCLE,
      {
        cx: WIDTH / 2 - 4,
        cy: headY + headH / 2 + 1,
        r: 1.5,
        fill: "#1f2937",
        id: "bt-robot-eye-left",
      },
      this.svgGroup_
    );
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.CIRCLE,
      {
        cx: WIDTH / 2 + 4,
        cy: headY + headH / 2 + 1,
        r: 1.5,
        fill: "#1f2937",
        id: "bt-robot-eye-right",
      },
      this.svgGroup_
    );
    // antena
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.LINE,
      {
        x1: WIDTH / 2,
        y1: headY - 2,
        x2: WIDTH / 2,
        y2: headY - 8,
        stroke: "#e5e7eb",
        "stroke-width": 1,
        id: "bt-robot-antenna",
      },
      this.svgGroup_
    );
    Blockly.utils.dom.createSvgElement(
      Blockly.utils.Svg.CIRCLE,
      {
        cx: WIDTH / 2,
        cy: headY - 9,
        r: 1.5,
        fill: "#e5e7eb",
        id: "bt-robot-antenna-tip",
      },
      this.svgGroup_
    );

    this.svgGroup_.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // on click, open Bluetooth status dialog in the React UI
      try {
        const ev = new CustomEvent("open-bluetooth-dialog", {
          detail: { from: "blockly-button" },
        });
        document.dispatchEvent(ev);
      } catch {}
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
    // Forçar posicionamento no canto superior direito
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

    // posicionamento lateral (direita -> esquerda)
    const SPACING = 8;
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

  render() {
    if (!this.svgGroup_) return;
    const st = this.opts.getStatus?.()?.status ?? "idle";
    const dot = this.svgGroup_.querySelector(
      "#bt-status"
    ) as SVGCircleElement | null;
    if (dot) {
      const color =
        st === "connected"
          ? "#10b981"
          : st === "error"
          ? "#ef4444"
          : st === "unsupported"
          ? "#f59e0b"
          : st === "requesting" || st === "reconnecting"
          ? "#f59e0b"
          : "#6b7280";
      dot.setAttribute("fill", color);
    }
    // update title for tooltip
    try {
      const parent = this.svgGroup_.ownerSVGElement?.parentElement;
      if (parent) parent.title = this.opts.getStatus?.()?.deviceName ?? st;
    } catch {}
    // atualizar cor da cabeça do robô conforme status
    try {
      const head = this.svgGroup_.querySelector(
        "#bt-robot-head"
      ) as SVGRectElement | null;
      if (head) {
        const headColor =
          st === "connected"
            ? "#bff7d6"
            : st === "error"
            ? "#ffd6d6"
            : st === "unsupported"
            ? "#fff4d6"
            : "#e5e7eb";
        head.setAttribute("fill", headColor);
      }
    } catch {}
  }
}

export function createBluetoothButton(
  workspace: Blockly.Workspace,
  opts: BluetoothButtonOptions = {}
) {
  let instance: BluetoothButton | null = null;
  return {
    init() {
      try {
        instance = new BluetoothButton(
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
    render() {
      try {
        instance?.render();
      } catch {}
    },
  };
}

Blockly.Css.register(`
.blocklyBluetoothButton>circle { cursor: pointer; }
.blocklyBluetoothButton:hover>circle { filter: brightness(1.05); }
`);
