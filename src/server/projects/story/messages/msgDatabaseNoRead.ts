import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  symbol: Symbol;
};

export default function msgDatabaseNoRead({
  symbol
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.UnusedDatabase,
    message: `Database "${
      symbol.name
    }" is written to, but is never used in a rule`,
    severity: DiagnosticSeverity.Warning
  };
}
