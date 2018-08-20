import { TokenRange } from "../Lexer";

export default function copyRange(range: TokenRange): TokenRange {
  return {
    endOffset: range.endOffset,
    endPosition: range.endPosition,
    startOffset: range.startOffset,
    startPosition: range.startPosition
  };
}
