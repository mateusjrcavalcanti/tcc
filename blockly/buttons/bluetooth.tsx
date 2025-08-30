import * as Blockly from "blockly";

type Options = {
  // Called when the user requests to connect
  onConnect?: () => Promise<void> | void;
  // Called when the user requests to disconnect
  onDisconnect?: () => Promise<void> | void;
  // Optional function to retrieve current status and device name.
  // We keep status as string to be permissive with app status types.
  getStatus?: () => { status: string; deviceName?: string };
};

export function createBluetoothButton(
  workspace: Blockly.Workspace,
  opts: Options = {}
) {
  let el: HTMLDivElement | null = null;

  function renderContent() {
    if (!el) return;
    // ensure positioned correctly relative to toolbox
    position();
    // Clear
    el.innerHTML = "";

    const statusInfo = opts.getStatus
      ? opts.getStatus()
      : { status: "disconnected" };
    const connected = statusInfo.status === "connected";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "8px";

    const dot = document.createElement("div");
    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.borderRadius = "6px";
    dot.style.background = connected
      ? "#10b981"
      : statusInfo.status === "requesting"
      ? "#f59e0b"
      : "#ef4444";

    const label = document.createElement("span");
    label.style.fontWeight = "600";
    label.style.color = "white";
    label.textContent =
      statusInfo.status === "requesting"
        ? "Procurando dispositivo..."
        : connected
        ? `Conectado: ${statusInfo.deviceName ?? "dispositivo"}`
        : "Desconectado";

    left.appendChild(dot);
    left.appendChild(label);

    const right = document.createElement("div");

    const btn = document.createElement("button");
    btn.style.padding = "0.35rem 0.6rem";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";
    btn.textContent = connected
      ? "Desconectar"
      : statusInfo.status === "requesting"
      ? "Procurando..."
      : "Conectar";
    if (
      statusInfo.status === "requesting" ||
      statusInfo.status === "unsupported"
    )
      btn.disabled = true;

    btn.addEventListener("click", async () => {
      try {
        if (connected) {
          await opts.onDisconnect?.();
        } else {
          await opts.onConnect?.();
        }
      } catch (e) {
        console.error(e);
      }
      // re-render after action
      try {
        renderContent();
      } catch {}
    });

    right.appendChild(btn);

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "space-between";
    container.style.gap = "12px";
    container.style.padding = "8px 12px";
    container.style.background = connected ? "#0f172a" : "#1f2937";
    container.style.borderRadius = "8px";

    container.appendChild(left);
    container.appendChild(right);

    el.appendChild(container);
  }

  function createDom() {
    const root = document.createElement("div");
    root.style.position = "absolute";
    root.style.top = "12px";
    root.style.left = "12px"; // will be adjusted by position()
    root.style.zIndex = "20";
    root.style.color = "white";
    root.style.fontFamily = "Inter, system-ui, sans-serif";
    // smooth transition when we adjust left to avoid jump
    root.style.transition = "left 160ms ease";
    root.style.willChange = "left";
    return root;
  }

  function init() {
    const parent = (
      workspace as unknown as { getParentSvg?: () => SVGElement }
    ).getParentSvg?.()?.parentNode as HTMLElement | null;
    if (!parent) return;
    el = createDom();
    parent.appendChild(el);
    renderContent();
    // re-render and reposition on resize
    window.addEventListener("resize", renderContent);
    window.addEventListener("resize", position);
  }

  function dispose() {
    try {
      window.removeEventListener("resize", renderContent);
    } catch {}
    try {
      window.removeEventListener("resize", position);
    } catch {}
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null;
  }

  function position() {
    if (!el) return;
    try {
      const parent = (
        workspace as unknown as { getParentSvg?: () => SVGElement }
      ).getParentSvg?.()?.parentNode as HTMLElement | null;
      if (!parent) return;
      const toolbox = parent.querySelector(
        ".blocklyToolboxDiv, .blockly-toolbox"
      ) as HTMLElement | null;
      if (toolbox) {
        const style = window.getComputedStyle(toolbox);
        const tRect = toolbox.getBoundingClientRect();
        const pRect = parent.getBoundingClientRect();
        // consider toolbox collapsed if hidden or extremely narrow
        const isHidden =
          style.display === "none" || toolbox.offsetParent === null;
        const isNarrow = tRect.width < 8;
        if (isHidden || isNarrow) {
          el.style.left = `12px`;
        } else {
          const offset = Math.max(12, tRect.right - pRect.left + 12);
          el.style.left = `${offset}px`;
        }
      } else {
        el.style.left = `12px`;
      }
    } catch {}
  }

  return { init, dispose, render: renderContent };
}
