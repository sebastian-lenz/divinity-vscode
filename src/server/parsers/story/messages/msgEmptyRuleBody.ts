import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

export default function msgEmptyRuleBody(): DiagnosticMessage {
  return {
    code: DiagnosticCode.EmptyRuleBody,
    message:
      "Expected at least one action, add `DB_NOOP(1);` if you don't want to perform any actions.",
    severity: DiagnosticSeverity.Error
  };
}
