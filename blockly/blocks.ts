import * as Blockly from "blockly/core";

const addText = {
  type: "add_text",
  message0: "Add text %1",
  args0: [{ type: "input_value", name: "TEXT", check: "String" }],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
};

export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  addText,
]);
