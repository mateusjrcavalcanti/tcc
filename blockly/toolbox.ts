export const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "MOTORES",
      colour: "#4A90E2",
      contents: [
        { kind: "block", type: "controls_for" },
        { kind: "sep", gap: 16 },
      ],
    },
    {
      kind: "category",
      name: "MOVIMENTO",
      colour: "#E91E63",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "controls_repeat_ext" },
        { kind: "sep", gap: 16 },
      ],
    },
    {
      kind: "category",
      name: "LUZ",
      colour: "#9C27B0",
      contents: [
        { kind: "block", type: "logic_boolean" },
        { kind: "sep", gap: 16 },
      ],
    },
    {
      kind: "category",
      name: "SOM",
      colour: "#673AB7",
      contents: [
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_append" },
        { kind: "sep", gap: 16 },
      ],
    },
    {
      kind: "category",
      name: "EVENTOS",
      colour: "#FFC107",
      contents: [
        { kind: "block", type: "logic_compare" },
        { kind: "sep", gap: 16 },
      ],
    },
    {
      kind: "category",
      name: "CONTROLE",
      colour: "#FF9800",
      contents: [
        { kind: "block", type: "controls_whileUntil" },
        { kind: "sep", gap: 16 },
      ],
    },
    {
      kind: "category",
      name: "SENSORES",
      colour: "#00BCD4",
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "sep", gap: 16 },
      ],
    },
    {
      kind: "category",
      name: "OPERADOR",
      colour: "#4CAF50",
      contents: [
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_single" },
        { kind: "block", type: "math_trig" },
        { kind: "block", type: "math_constant" },
        { kind: "block", type: "logic_operation" },
        { kind: "sep", gap: 16 },
      ],
    },
    {
      kind: "category",
      name: "VARIÁVEIS",
      colour: "#FF5722",
      custom: "VARIABLE",
    },
    {
      kind: "category",
      name: "MEUS BLOCOS",
      colour: "#F44336",
      custom: "PROCEDURE",
    },
  ],
};
