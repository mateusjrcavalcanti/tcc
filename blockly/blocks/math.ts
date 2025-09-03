import { opSvgDataUrl } from ".";

export const mathBlocks = [
  {
    type: "math_add",
    message0: "%1 %2 %3",
    args0: [
      { type: "field_input", name: "A", check: "Number" },
      {
        type: "field_image",
        src: opSvgDataUrl("+", 44),
        width: 32,
        height: 32,
        alt: "+",
      },
      { type: "field_input", name: "B", check: "Number" },
    ],
    inputsInline: true,
    output: "Number",
    colour: "#4CAF50",
  },
  {
    type: "math_subtract",
    message0: "%1 %2 %3",
    args0: [
      { type: "field_input", name: "A", check: "Number" },
      {
        type: "field_image",
        src: opSvgDataUrl("−", 44),
        width: 32,
        height: 32,
        alt: "-",
      },
      { type: "field_input", name: "B", check: "Number" },
    ],
    inputsInline: true,
    output: "Number",
    colour: "#4CAF50",
  },
  {
    type: "math_multiply",
    message0: "%1 %2 %3",
    args0: [
      { type: "field_input", name: "A", check: "Number" },
      {
        type: "field_image",
        src: opSvgDataUrl("×", 44),
        width: 32,
        height: 32,
        alt: "×",
      },
      { type: "field_input", name: "B", check: "Number" },
    ],
    inputsInline: true,
    output: "Number",
    colour: "#4CAF50",
  },
  {
    type: "math_divide",
    message0: "%1 %2 %3",
    args0: [
      { type: "field_input", name: "A", check: "Number" },
      {
        type: "field_image",
        src: opSvgDataUrl("÷", 44),
        width: 32,
        height: 32,
        alt: "÷",
      },
      { type: "field_input", name: "B", check: "Number" },
    ],
    inputsInline: true,
    output: "Number",
    colour: "#4CAF50",
  },
];
