import { Location, TextDocument } from "vscode-languageserver";

import { TokenRange } from "../parsers/story/Lexer";
import unpackRange from "../parsers/story/utils/unpackRange";

export default function toLocation(
  document: TextDocument,
  range: TokenRange
): Location {
  return {
    uri: document.uri,
    range: unpackRange(range)
  };
}
