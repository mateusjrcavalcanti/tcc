declare module "@mit-app-inventor/blockly-plugin-workspace-multiselect" {
  import type * as Blockly from "blockly";

  export interface MultiselectCopyPasteOptions {
    crossTab?: boolean;
    menu?: boolean;
  }

  export interface MultiselectOptions {
    useDoubleClick?: boolean;
    bumpNeighbours?: boolean;
    multiFieldUpdate?: boolean;
    workspaceAutoFocus?: boolean;
    multiSelectKeys?: string[];
    multiselectIcon?: {
      hideIcon?: boolean;
      weight?: number;
      enabledIcon?: string;
      disabledIcon?: string;
    };
    multiselectCopyPaste?: MultiselectCopyPasteOptions;
  }

  export class Multiselect {
    constructor(workspace: Blockly.WorkspaceSvg);
    init(options?: MultiselectOptions): void;
    dispose(): void;

    static withoutMultiFieldUpdates<T>(fn: () => T): T;
    static setMultiselectIcon(icons: {
      enabledIcon?: string;
      disabledIcon?: string;
    }): void;
  }

  // Optionais (expostos pelo pacote, mas raramente usados diretamente)
  export const MultiselectDraggable: unknown;
  export const dragSelectionWeakMap: WeakMap<SVGElement, Set<string>>;
  export const inMultipleSelectionModeWeakMap: WeakMap<SVGElement, boolean>;
}
