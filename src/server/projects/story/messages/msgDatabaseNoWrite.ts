import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  symbol: Symbol;
};

export default function msgDatabaseNoWrite({
  symbol
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.UnusedDatabase,
    message: `Database "${
      symbol.name
    }" is used in a rule, but is never written to`,
    severity: DiagnosticSeverity.Warning
  };
}
