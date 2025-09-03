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

// Geradores para blocos aritméticos com operador fixo
forBlock["math_add"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "0";
  const b = generator.valueToCode(block, "B", Order.NONE) || "0";
  const code = `${a} + ${b}`;
  return [code, Order.NONE];
};

forBlock["math_subtract"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "0";
  const b = generator.valueToCode(block, "B", Order.NONE) || "0";
  const code = `${a} - ${b}`;
  return [code, Order.NONE];
};

forBlock["math_multiply"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "1";
  const b = generator.valueToCode(block, "B", Order.NONE) || "1";
  const code = `${a} * ${b}`;
  return [code, Order.NONE];
};

forBlock["math_divide"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "1";
  const b = generator.valueToCode(block, "B", Order.NONE) || "1";
  const code = `${a} / ${b}`;
  return [code, Order.NONE];
};

// Motores (comportamento como statements)
forBlock["motor_run_for_duration"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const duration = generator.valueToCode(block, "DURATION", Order.NONE) || "0";
  const code = `# motor_run_for_duration: duração=${duration}\n`;
  return code;
};

forBlock["motor_go_shortest_path"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  const code = `# motor_go_shortest_path\n`;
  return code;
};

forBlock["motor_start"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const speed = generator.valueToCode(block, "SPEED", Order.NONE) || "0";
  const code = `# motor_start: speed=${speed}\n`;
  return code;
};

forBlock["motor_stop"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  const code = `# motor_stop\n`;
  return code;
};

forBlock["motor_set_speed"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const speed = generator.valueToCode(block, "SPEED", Order.NONE) || "0";
  const code = `# motor_set_speed: speed=${speed}\n`;
  return code;
};

forBlock["motor_position"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  const code = `0`;
  return [code, Order.NONE];
};

forBlock["motor_velocity"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  const code = `0`;
  return [code, Order.NONE];
};

// Som
forBlock["sound_play_and_wait"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  const code = `# sound_play_and_wait\n`;
  return code;
};
forBlock["sound_play"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  const code = `# sound_play\n`;
  return code;
};
forBlock["sound_beep_for_duration"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const d = generator.valueToCode(block, "DURATION", Order.NONE) || "0";
  return `# sound_beep_for_duration: ${d}\n`;
};
forBlock["sound_start_beep"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  return `# sound_start_beep\n`;
};
forBlock["sound_stop_all"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  return `# sound_stop_all\n`;
};
forBlock["sound_change_effect_by"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const v = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  return `# sound_change_effect_by ${v}\n`;
};
forBlock["sound_set_effect_to"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const v = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  return `# sound_set_effect_to ${v}\n`;
};
forBlock["sound_clear_effects"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  return `# sound_clear_effects\n`;
};
forBlock["sound_change_volume_by"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const v = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  return `# sound_change_volume_by ${v}\n`;
};
forBlock["sound_set_volume_to"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const v = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  return `# sound_set_volume_to ${v}\n`;
};
forBlock["sound_volume"] = function (
  _block: Blockly.Block,
  _generator: Blockly.CodeGenerator
) {
  void _block;
  void _generator;
  return ["0", Order.NONE];
};

// Eventos (statements)
const eventStub = function (name: string) {
  return function (_block: Blockly.Block, _generator: Blockly.CodeGenerator) {
    void _block;
    void _generator;
    return `# ${name}\n`;
  };
};
forBlock["event_when_program_starts"] = eventStub("event_when_program_starts");
forBlock["event_when_color"] = eventStub("event_when_color");
forBlock["event_when_pressed"] = eventStub("event_when_pressed");
forBlock["event_when_distance"] = eventStub("event_when_distance");
forBlock["event_when_tilted"] = eventStub("event_when_tilted");
forBlock["event_when_orientation"] = eventStub("event_when_orientation");
forBlock["event_when_shaken"] = eventStub("event_when_shaken");
forBlock["event_when_button_pressed"] = eventStub("event_when_button_pressed");
forBlock["event_when_timer_greater_than"] = eventStub(
  "event_when_timer_greater_than"
);
forBlock["event_when_condition"] = eventStub("event_when_condition");

// Controle
forBlock["control_wait"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const t = generator.valueToCode(block, "DURATION", Order.NONE) || "0";
  return `# wait ${t}\n`;
};
forBlock["controls_repeat_ext"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const times = generator.valueToCode(block, "TIMES", Order.NONE) || "0";
  const body = generator.statementToCode(block, "DO");
  const code = `for _ in range(${times}):\n${body}`;
  return code;
};
forBlock["control_forever"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const body = generator.statementToCode(block, "DO");
  return `while True:\n${body}`;
};
forBlock["controls_if"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const cond = generator.valueToCode(block, "IF0", Order.NONE) || "False";
  const thenCode = generator.statementToCode(block, "DO0");
  return `if ${cond}:\n${thenCode}`;
};
forBlock["controls_if_else"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const cond = generator.valueToCode(block, "IF0", Order.NONE) || "False";
  const thenCode = generator.statementToCode(block, "DO0");
  const elseCode = generator.statementToCode(block, "ELSE");
  return `if ${cond}:\n${thenCode}else:\n${elseCode}`;
};
forBlock["control_wait_until"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const cond = generator.valueToCode(block, "CONDITION", Order.NONE) || "False";
  return `while not (${cond}):\n    pass\n`;
};
forBlock["controls_whileUntil"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const mode = block.getFieldValue && block.getFieldValue("MODE");
  const cond = generator.valueToCode(block, "BOOL", Order.NONE) || "False";
  if (mode === "UNTIL") {
    return `while not (${cond}):\n    pass\n`;
  }
  return `while ${cond}:\n    pass\n`;
};
forBlock["control_stop_other_scripts"] = function () {
  return `# stop other scripts\n`;
};
forBlock["control_stop"] = function () {
  return `# stop\n`;
};

// Sensores
forBlock["sensor_is_color"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const c = generator.valueToCode(block, "COLOR", Order.NONE) || "''";
  return [`${c} == ''`, Order.NONE];
};
forBlock["sensor_color"] = function () {
  return ["''", Order.NONE];
};
forBlock["sensor_is_reflection_less_than"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const v = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  return [`0 < ${v}`, Order.NONE];
};
forBlock["sensor_reflected_light"] = function () {
  return ["0", Order.NONE];
};
forBlock["sensor_is_pressed"] = function () {
  return ["False", Order.NONE];
};
forBlock["sensor_pressure_percent"] = function () {
  return ["0", Order.NONE];
};
forBlock["sensor_is_closer_than"] = function () {
  return ["False", Order.NONE];
};
forBlock["sensor_distance_percent"] = function () {
  return ["0", Order.NONE];
};
forBlock["sensor_is_tilted"] = function () {
  return ["False", Order.NONE];
};
forBlock["sensor_orientation"] = function () {
  return ["''", Order.NONE];
};
forBlock["sensor_is_shaken"] = function () {
  return ["False", Order.NONE];
};
forBlock["sensor_pitch_angle"] = function () {
  return ["0", Order.NONE];
};
forBlock["sensor_set_yaw_angle_to_zero"] = function () {
  return `# sensor_set_yaw_angle_to_zero\n`;
};
forBlock["sensor_is_button_pressed"] = function () {
  return ["False", Order.NONE];
};
forBlock["sensor_timer"] = function () {
  return ["0", Order.NONE];
};
forBlock["sensor_reset_timer"] = function () {
  return `# sensor_reset_timer\n`;
};

// Operadores adicionais
forBlock["math_random_int"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const from = generator.valueToCode(block, "FROM", Order.NONE) || "0";
  const to = generator.valueToCode(block, "TO", Order.NONE) || "0";
  return [`random.randint(${from}, ${to})`, Order.NONE];
};
forBlock["logic_compare"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "0";
  const b = generator.valueToCode(block, "B", Order.NONE) || "0";
  const op = (block.getFieldValue && block.getFieldValue("OP")) || "==";
  return [`${a} ${op} ${b}`, Order.NONE];
};
forBlock["logic_operation"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "False";
  const b = generator.valueToCode(block, "B", Order.NONE) || "False";
  const op =
    block.getFieldValue && block.getFieldValue("OP") === "AND" ? "and" : "or";
  return [`${a} ${op} ${b}`, Order.NONE];
};
forBlock["logic_and"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "False";
  const b = generator.valueToCode(block, "B", Order.NONE) || "False";
  return [`${a} and ${b}`, Order.NONE];
};
forBlock["logic_or"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "False";
  const b = generator.valueToCode(block, "B", Order.NONE) || "False";
  return [`${a} or ${b}`, Order.NONE];
};
forBlock["logic_negate"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const v = generator.valueToCode(block, "BOOL", Order.NONE) || "False";
  return [`not (${v})`, Order.NONE];
};
forBlock["operator_is_between"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const val = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
  const low = generator.valueToCode(block, "LOW", Order.NONE) || "0";
  const high = generator.valueToCode(block, "HIGH", Order.NONE) || "0";
  return [`(${low} <= ${val} <= ${high})`, Order.NONE];
};
forBlock["text_join"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "''";
  const b = generator.valueToCode(block, "B", Order.NONE) || "''";
  return [`str(${a}) + str(${b})`, Order.NONE];
};
forBlock["text_charAt"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const text = generator.valueToCode(block, "VALUE", Order.NONE) || "''";
  const index = generator.valueToCode(block, "AT", Order.NONE) || "0";
  return [`(${text})[${index}]`, Order.NONE];
};
forBlock["text_length"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const text = generator.valueToCode(block, "VALUE", Order.NONE) || "''";
  return [`len(${text})`, Order.NONE];
};
forBlock["text_contains"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const substr = generator.valueToCode(block, "SUB", Order.NONE) || "''";
  const text = generator.valueToCode(block, "VALUE", Order.NONE) || "''";
  return [`(${substr}) in (${text})`, Order.NONE];
};
forBlock["math_modulo"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const a = generator.valueToCode(block, "A", Order.NONE) || "0";
  const b = generator.valueToCode(block, "B", Order.NONE) || "1";
  return [`${a} % ${b}`, Order.NONE];
};
forBlock["math_round"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const v = generator.valueToCode(block, "NUM", Order.NONE) || "0";
  return [`round(${v})`, Order.NONE];
};
forBlock["math_single"] = function (
  block: Blockly.Block,
  generator: Blockly.CodeGenerator
) {
  const v = generator.valueToCode(block, "NUM", Order.NONE) || "0";
  const op = (block.getFieldValue && block.getFieldValue("OP")) || "NEG";
  if (op === "ROOT") return [`(${v}) ** 0.5`, Order.NONE];
  return [`-${v}`, Order.NONE];
};

// Pequeno gerador de texto já existente (mantido)
