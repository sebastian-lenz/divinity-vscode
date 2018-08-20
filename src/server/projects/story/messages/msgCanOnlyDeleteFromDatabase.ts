import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";
import printSymbolType from "../utils/printSymbolType";

export type Params = {
  symbol: Symbol;
};

export default function msgCanOnlyDeleteFromDatabase({
  symbol
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.CanOnlyDeleteFromDatabase,
    message: `NOT actions can only reference databases; "${
      symbol.name
    }" is a ${printSymbolType(symbol)}`,
    severity: DiagnosticSeverity.Error
  };
}
