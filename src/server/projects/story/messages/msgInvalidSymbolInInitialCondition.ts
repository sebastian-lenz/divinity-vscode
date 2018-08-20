import printSymbolType from "../utils/printSymbolType";
import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  ruleType: "IF" | "PROC" | "QRY";
  symbol: Symbol;
};

export default function msgInvalidSymbolInInitialCondition({
  ruleType,
  symbol
}: Params): DiagnosticMessage {
  let message: string;
  switch (ruleType) {
    case "IF":
      message = `Initial rule condition can only be an event or a DB; "${
        symbol.name
      }" is a ${printSymbolType(symbol)}`;
      break;

    case "PROC":
      message = `Initial proc condition can only be a PROC name; "${
        symbol.name
      }" is a ${printSymbolType(symbol)}`;
      break;

    case "QRY":
      message = `Initial query condition can only be a user-defined QRY name; "${
        symbol.name
      }" is a ${printSymbolType(symbol)}`;
      break;

    default:
      message = `Invalid initial condition`;
      break;
  }

  return {
    code: DiagnosticCode.InvalidSymbolInInitialCondition,
    message,
    severity: DiagnosticSeverity.Error
  };
}
