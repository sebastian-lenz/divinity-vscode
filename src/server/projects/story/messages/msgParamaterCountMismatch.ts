import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

function printNumParameters(symbols: Array<Symbol>) {
  const nums = symbols.map(symbol => symbol.numParameters).sort();
  if (nums.length === 1 && nums[0] === 1) {
    return `1 parameter`;
  }

  const orNum = nums.length > 1 ? nums.pop() : undefined;
  return `${nums.join(", ")}${orNum ? ` or ${orNum}` : ""} parameters`;
}

export type Params = {
  actualSymbol: Symbol;
  existingSymbols: Array<Symbol>;
};

export default function msgParamaterCountMismatch({
  actualSymbol,
  existingSymbols
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.UnresolvedSymbol,
    message: `Symbol "${actualSymbol.name}" could not be resolved: "${
      actualSymbol.name
    }" requires ${printNumParameters(existingSymbols)}.`,
    severity: DiagnosticSeverity.Error
  };
}
