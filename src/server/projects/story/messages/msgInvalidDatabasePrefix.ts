import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  symbol: Symbol;
};

export default function msgInvalidDatabasePrefix({
  symbol
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.DbNamingStyle,
    message: `Name of database "${
      symbol.name
    }" should start with the prefix "DB"`,
    severity: DiagnosticSeverity.Error
  };
}
