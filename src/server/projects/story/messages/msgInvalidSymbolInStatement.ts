import printSymbolType from "../utils/printSymbolType";
import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  symbol: Symbol;
};

export default function msgInvalidSymbolInStatement({
  symbol
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidSymbolInFact,
    message: `KB rule actions can only reference databases, calls and PROCs; "${
      symbol.name
    }" is a ${printSymbolType(symbol)}`,
    severity: DiagnosticSeverity.Error
  };
}
