import * as Blockly from "blockly/core";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { mathBlocks } from "./math";
import { motorBlocks } from "./motor";
import { soundBlocks } from "./sound";
import { eventBlocks } from "./events";
import { controlBlocks } from "./control";
import { sensorBlocks } from "./sensors";
import { operatorBlocks } from "./operators";

export function opSvgDataUrl(
  op: string,
  size = 48,
  bg = "#4CAF50",
  fg = "#ffffff"
) {
  // Escape characters that would break XML/SVG when included in text content
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&apos;")
      .replace(/"/g, "&quot;");

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>` +
    `<circle cx='${size / 2}' cy='${size / 2}' r='${size / 2 - 1}' fill='${esc(
      bg
    )}' stroke='${esc(bg)}'/>` +
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Sour Gummy, Inter, system-ui, sans-serif' font-size='${Math.floor(
      size * 0.55
    )}' font-weight='700' fill='${esc(fg)}'>${esc(op)}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function categorySvgDataUrl(innerSvg: string, size = 40, bg = "#4A90E2") {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' fill='none'>` +
    `<circle cx='${size / 2}' cy='${size / 2}' r='${
      size / 2 - 1
    }' fill='${bg}' stroke='${bg}'/>` +
    `<g transform='translate(${size * 0.12}, ${size * 0.12}) scale(${
      (size * 0.76) / 24
    })' fill='none' stroke='#fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>${innerSvg}</g>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type IconComp = React.ComponentType<React.SVGProps<SVGSVGElement>>;

function shiftPlaceholders(message: string, shift: number) {
  return message.replace(/%(\d+)/g, (_m, n) => `%${Number(n) + shift}`);
}

function addIconToDef(def: Record<string, unknown>) {
  if (!def) return def;

  type MutableDef = {
    [k: string]: unknown;
    message0?: string;
    args0?: unknown[];
    colour?: string;
    icon?: unknown;
  };
  const mutable = def as MutableDef;

  let innerFragment: string | null = null;
  let bgColor: string | undefined;
  let altText: string | undefined;

  type LocalIconSpec =
    | { Icon: IconComp; bg?: string; alt?: string }
    | { svg: string; bg?: string; alt?: string }
    | string
    | undefined;
  const blockIcon = mutable.icon as LocalIconSpec;

  if (blockIcon) {
    if (
      typeof blockIcon === "object" &&
      blockIcon !== null &&
      "Icon" in blockIcon
    ) {
      try {
        const obj = blockIcon as LocalIconSpec & {
          Icon: IconComp;
          bg?: string;
          alt?: string;
        };
        const IconC = obj.Icon as IconComp;
        const svg = renderToStaticMarkup(
          React.createElement(IconC, { width: 36, height: 36, strokeWidth: 2 })
        );
        innerFragment = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
        bgColor = obj.bg;
        altText = obj.alt;
      } catch {
        innerFragment = null;
      }
    } else if (
      typeof blockIcon === "object" &&
      blockIcon !== null &&
      "svg" in blockIcon
    ) {
      const obj = blockIcon as LocalIconSpec & {
        svg: string;
        bg?: string;
        alt?: string;
      };
      innerFragment = obj.svg;
      bgColor = obj.bg;
      altText = obj.alt;
    } else if (typeof blockIcon === "string") {
      innerFragment = blockIcon;
    }
  }

  if (!innerFragment) return mutable as unknown as Record<string, unknown>;

  const iconSrc = categorySvgDataUrl(innerFragment, 40, bgColor || "#888");
  const imageArg = {
    type: "field_image",
    src: iconSrc,
    width: 32,
    height: 32,
    alt: altText || "icon",
  };

  if (typeof mutable.message0 === "string") {
    if (/%\d+/.test(mutable.message0)) {
      mutable.message0 = `%1 ${shiftPlaceholders(mutable.message0, 1)}`;
    } else {
      mutable.message0 = `%1 ${mutable.message0}`;
    }
  }

  if (Array.isArray(mutable.args0)) {
    mutable.args0 = [imageArg, ...mutable.args0];
  } else {
    mutable.args0 = [imageArg];
  }

  return mutable as unknown as Record<string, unknown>;
}

const allBlocks = [
  {
    type: "add_text",
    message0: "Adicionar texto %1",
    args0: [{ type: "input_value", name: "TEXT", check: "String" }],
    previousStatement: null,
    nextStatement: null,
    colour: 160,
  },
  ...mathBlocks,
  ...motorBlocks,
  ...soundBlocks,
  ...eventBlocks,
  ...controlBlocks,
  ...sensorBlocks,
  ...operatorBlocks,
].map(addIconToDef);

export const blocks =
  Blockly.common.createBlockDefinitionsFromJsonArray(allBlocks);

// Listener para sincronizar variável 'volume' quando blocos `sound_volume` usam o checkbox
function syncVolumeVariable(ws: Blockly.Workspace | null) {
  if (!ws) return;
  try {
    const hasChecked = ws.getAllBlocks(false).some((b) => {
      return (
        b.type === "sound_volume" &&
        typeof b.getFieldValue === "function" &&
        b.getFieldValue("USE_VOLUME") === "TRUE"
      );
    });

    const varModel = ws.getVariable("volume");
    if (hasChecked) {
      if (!varModel) {
        ws.createVariable("volume", "Number", "volume");
      }
    } else {
      if (varModel) {
        try {
          ws.deleteVariableById(varModel.getId());
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}

// adiciona listener ao workspace principal (se disponível)
try {
  const main =
    Blockly.common.getMainWorkspace && Blockly.common.getMainWorkspace();
  if (main && typeof main.addChangeListener === "function") {
    main.addChangeListener(() => syncVolumeVariable(main));
  }
} catch {
  // ignore
}
