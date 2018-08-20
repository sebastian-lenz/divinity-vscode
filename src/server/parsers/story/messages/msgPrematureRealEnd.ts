import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

export default function msgPrematureRealEnd(): DiagnosticMessage {
  return {
    code: DiagnosticCode.PrematureRealEnd,
    message: 'Real literals are not allowed to end with ".".',
    severity: DiagnosticSeverity.Error
  };
}
