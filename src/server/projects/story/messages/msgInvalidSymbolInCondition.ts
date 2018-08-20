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

export default function msgInvalidSymbolInCondition({
  symbol
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidFunctionTypeInCondition,
    message: `Subsequent rule conditions can only be queries or DBs; "${
      symbol.name
    }" is a ${printSymbolType(symbol)}`,
    severity: DiagnosticSeverity.Error
  };
}
