import { PackedPosition } from "../Lexer";

export default function packPosition(
  line: number,
  character: number
): PackedPosition {
  return (character & 0x3fffff) * 0x40000000 + (line & 0x3fffffff);
}
