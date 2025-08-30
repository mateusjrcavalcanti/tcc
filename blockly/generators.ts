import { Order } from "blockly/python";
import * as Blockly from "blockly/core";

export const forBlock = Object.create(null);

forBlock["add_text"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  // Simples gerador Python: imprime o texto
  const text = generator.valueToCode(block, "TEXT", Order.NONE) || "''";
  const code = `print(${text})\n`;
  return code;
};
