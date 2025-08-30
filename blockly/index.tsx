"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import { toolbox } from "./toolbox";
import { blocks } from "./blocks";
import { forBlock } from "./generators";
import "./styles.css";
import { createPlayButton } from "./buttons/play";
import { createBluetoothButton } from "./buttons/bluetooth";
import { useBluetooth } from "../app/bluetooth-context";
import {
  ScrollOptions,
  ScrollBlockDragger,
  ScrollMetricsManager,
} from "@blockly/plugin-scroll-options";
import { Multiselect } from "@mit-app-inventor/blockly-plugin-workspace-multiselect";

// Register blocks and generators
Blockly.common.defineBlocks(blocks);

// Define the Dracula theme
const draculaTheme = Blockly.Theme.defineTheme("dracula", {
  name: "dracula",
  base: Blockly.Themes.Classic,
  fontStyle: {
    family: "Inter, system-ui, sans-serif",
    weight: "normal",
    size: 12,
  },
  componentStyles: {
    workspaceBackgroundColour: "#282a36",
    toolboxBackgroundColour: "#21222c",
    toolboxForegroundColour: "#f8f8f2",
    flyoutBackgroundColour: "#21222c",
    flyoutForegroundColour: "#f8f8f2",
    flyoutOpacity: 0.95,
    scrollbarColour: "#44475a",
    insertionMarkerColour: "#bd93f9",
    insertionMarkerOpacity: 0.3,
    scrollbarOpacity: 0.4,
    cursorColour: "#f8f8f2",
  },
});

// Assign our generators to the Python generator
Object.assign(pythonGenerator.forBlock, forBlock);

const BlocklyEditor = forwardRef(function BlocklyEditor(
  {
    className = "",
  }: {
    className?: string;
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const subscribersRef = useRef<Set<(code: string) => void>>(new Set());
  // bluetooth hook must be called at top level of component
  const bt = useBluetooth();
  const btInstanceRef = useRef<{
    init: () => void;
    dispose: () => void;
    render?: () => void;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Monkey patch defensivo: alguns plugins (ex.: workspace-multiselect) podem acionar
    // caminhos no FocusManager do Blockly que assumem um node com canBeFocused().
    // Em certas combinações de versões isso quebra em setSelected -> focusNode.
    // Envolvemos setSelected em try/catch para evitar crash e manter a UI operável.
    try {
      type BlocklyCommon = {
        setSelected?: (...args: unknown[]) => unknown;
        __patchedSetSelected?: boolean;
      };
      const common = (Blockly as unknown as { common?: BlocklyCommon }).common;
      if (
        common &&
        typeof common.setSelected === "function" &&
        !common.__patchedSetSelected
      ) {
        const original = common.setSelected.bind(common);
        common.setSelected = (...args: unknown[]) => {
          try {
            return original(...args);
          } catch {
            // Evita que o erro "a.canBeFocused is not a function" derrube a página.
            return undefined;
          }
        };
        common.__patchedSetSelected = true;
      }
    } catch {}
    const options = {
      plugins: {
        blockDragger: ScrollBlockDragger,
        metricsManager: ScrollMetricsManager,
      },
      toolbox,
      scrollbars: true,
      sounds: true,
      grid: { spacing: 20, length: 3, colour: "#44475a", snap: true },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.85,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
      theme: draculaTheme,
      move: {
        scrollbars: { horizontal: true, vertical: true },
        drag: true,
        wheel: true, // Required for wheel scroll to work.
      },
      useDoubleClick: false, // Double click the blocks to collapse/expand
      bumpNeighbours: false, // Bump neighbours after dragging to avoid overlapping.
      multiFieldUpdate: true, // Keep the fields of multiple selected same-type blocks with the same value
      workspaceAutoFocus: true, // Auto focus the workspace when the mouse enters.
      multiselectIcon: {
        hideIcon: false,
        weight: 3,
        enabledIcon:
          "https://github.com/mit-cml/workspace-multiselect/raw/main/test/media/select.svg",
        disabledIcon:
          "https://github.com/mit-cml/workspace-multiselect/raw/main/test/media/unselect.svg",
      }, // Use custom icon for the multi select controls.
    };
    const workspace = Blockly.inject(containerRef.current, options);

    // Initialize plugins.
    const multiselectPlugin = new Multiselect(workspace);
    const scrollOptionsPlugin = new ScrollOptions(workspace);
    multiselectPlugin.init(options);
    scrollOptionsPlugin.init();

    workspaceRef.current = workspace;
    // create Play button (executes generated Python). It will notify subscribers with code.
    let playInstance: { init: () => void; dispose: () => void } | null = null;
    try {
      playInstance = createPlayButton(workspace, {
        onExecute(code: string) {
          try {
            // loga o código gerado no console quando o botão for clicado
            console.log("Play button clicked — generated Python:\n", code);
          } catch {}
          try {
            subscribersRef.current.forEach((s) => {
              try {
                s(code);
              } catch {}
            });
          } catch {}
        },
      });
      playInstance.init();
    } catch {}

    // create Bluetooth button integrated with app Bluetooth context
    // workspace created; bluetooth button will be created in separate effect

    // Load saved state if any
    try {
      const data = window.localStorage?.getItem("mainWorkspace");
      if (data) {
        Blockly.Events.disable();
        Blockly.serialization.workspaces.load(JSON.parse(data), workspace);
        Blockly.Events.enable();
      }
    } catch {
      // ignore
    }

    const saveAndNotify = (e: Blockly.Events.Abstract) => {
      if (e.isUiEvent) return;
      const data = Blockly.serialization.workspaces.save(workspace);
      window.localStorage?.setItem("mainWorkspace", JSON.stringify(data));
      if (workspace.isDragging && workspace.isDragging()) return;
      try {
        const code = pythonGenerator.workspaceToCode(workspace);
        subscribersRef.current.forEach((s) => {
          try {
            s(code);
          } catch {}
        });
      } catch {}
    };

    workspace.addChangeListener(saveAndNotify);

    // notify initial code after load
    try {
      const initialCode = pythonGenerator.workspaceToCode(workspace);
      subscribersRef.current.forEach((s) => {
        try {
          s(initialCode);
        } catch {}
      });
    } catch {}

    return () => {
      try {
        playInstance?.dispose();
      } catch {}
      // btInstance is disposed in the other effect cleanup
      try {
        workspace.dispose();
      } catch {}
    };
  }, []);

  // create bluetooth button when workspace exists and bt hook is available
  React.useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    // create or recreate button
    try {
      // dispose previous
      try {
        btInstanceRef.current?.dispose();
      } catch {}
      const instance = createBluetoothButton(ws, {
        onConnect: async () => {
          await bt.connect();
        },
        onDisconnect: async () => {
          bt.disconnect();
        },
        getStatus: () => ({
          status: bt.status,
          deviceName: bt.device?.name ?? undefined,
        }),
      });
      btInstanceRef.current = instance;
      instance.init();
      return () => {
        try {
          btInstanceRef.current?.dispose();
        } catch {}
        btInstanceRef.current = null;
      };
    } catch {
      // ignore
    }
  }, [bt, bt.status, bt.device]);
  // re-render bluetooth button when device/status change
  React.useEffect(() => {
    try {
      btInstanceRef.current?.render?.();
    } catch {}
  }, [bt.status, bt.device]);

  useImperativeHandle(ref, () => ({
    clear() {
      try {
        const ws = workspaceRef.current;
        ws?.clear();
        // remove persisted state
        try {
          window.localStorage?.removeItem("mainWorkspace");
        } catch {}
        // notify subscribers that code is now empty
        subscribersRef.current.forEach((s) => {
          try {
            s("");
          } catch {}
        });
      } catch {}
    },
    getCode() {
      try {
        const ws = workspaceRef.current;
        if (!ws) return "";
        return pythonGenerator.workspaceToCode(ws);
      } catch {
        return "";
      }
    },
    subscribe(fn: (code: string) => void) {
      subscribersRef.current.add(fn);
    },
    unsubscribe(fn: (code: string) => void) {
      subscribersRef.current.delete(fn);
    },
  }));

  return <div ref={containerRef} className={className} />;
});

export default BlocklyEditor;
