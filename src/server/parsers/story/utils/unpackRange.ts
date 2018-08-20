import { Range } from "vscode-languageserver";

import unpackPosition from "./unpackPosition";
import { TokenRange } from "../Lexer";

export default function unpackRange(range: TokenRange): Range {
  return {
    end: unpackPosition(range.endPosition),
    start: unpackPosition(range.startPosition)
  };
}
