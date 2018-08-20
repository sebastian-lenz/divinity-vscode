import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

function printSimiliars(symbols: Array<Symbol>): string {
  const names = symbols
    .map(symbol => `"${symbol.name}"`)
    .reduce(
      (result, name) =>
        result.indexOf(name) === -1 ? [...result, name] : result,
      [] as Array<string>
    )
    .sort();

  const orName = names.length > 1 ? names.pop() : undefined;
  return `${names.join(", ")}${orName ? ` or ${orName}` : ""}`;
}

export type Params = {
  actualSymbol: Symbol;
  similiarSymbols: Array<Symbol>;
};

export default function msgSigantureTypo({
  actualSymbol,
  similiarSymbols
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.UnresolvedSymbol,
    message: `Symbol "${
      actualSymbol.name
    }" could not be resolved: did you mean ${printSimiliars(similiarSymbols)}?`,
    severity: DiagnosticSeverity.Error
  };
}
