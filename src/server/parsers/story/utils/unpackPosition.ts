import { Position } from "vscode-languageserver";

import { PackedPosition } from "../Lexer";

export default function unpackPosition(value: PackedPosition): Position {
  var line = value & 0x3fffffff;
  var character = (value - line) / 0x40000000;
  return { line, character };
}
