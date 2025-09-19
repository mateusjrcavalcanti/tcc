import { Music } from "lucide-react";

export const soundBlocks = [
  {
    type: "sound_play_and_wait",
    message0: "Reproduzir som %1 até que esteja concluído",
    args0: [
      {
        type: "field_dropdown",
        name: "som",
        options: [
          ["Som 1", "SOM1"],
          ["Som 2", "SOM2"],
          ["Bip", "BEEP"],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: "#673AB7",
    icon: { Icon: Music, bg: "#673AB7", alt: "Som" },
  },
  {
    type: "sound_stop_all",
    message0: "Parar todos os sons",
    previousStatement: null,
    nextStatement: null,
    colour: "#673AB7",
    icon: { Icon: Music, bg: "#673AB7", alt: "Som" },
  },
  {
    type: "sound_change_volume_by",
    message0: "Alterar volume em %1",
    args0: [{ type: "field_input", name: "volume" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#673AB7",
    icon: { Icon: Music, bg: "#673AB7", alt: "Som" },
  },
  {
    type: "sound_set_volume_to",
    message0: "Definir volume para %1",
    args0: [{ type: "input_value", name: "volume" }],
    previousStatement: null,
    nextStatement: null,
    colour: "#673AB7",
    icon: { Icon: Music, bg: "#673AB7", alt: "Som" },
  },
  {
    type: "sound_volume",
    message0: "Volume %1",
    args0: [{ type: "field_checkbox", name: "USE_VOLUME", checked: false }],
    output: "Number",
    colour: "#673AB7",
    icon: { Icon: Music, bg: "#673AB7", alt: "Som" },
  },
];
