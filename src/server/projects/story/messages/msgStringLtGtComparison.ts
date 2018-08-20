import { CallerNode } from "../../../parsers/story/utils/isCallerNode";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  operator: string;
};

export default function msgStringLtGtComparison({
  operator
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.StringLtGtComparison,
    message: `String comparison using operator ${operator} - probably a mistake?`,
    severity: DiagnosticSeverity.Error
  };
}
