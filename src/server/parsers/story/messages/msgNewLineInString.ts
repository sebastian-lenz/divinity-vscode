import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

export default function msgNewLineInString(): DiagnosticMessage {
  return {
    code: DiagnosticCode.NewLineInString,
    message: "String literals cannot contain line breaks.",
    severity: DiagnosticSeverity.Error
  };
}
