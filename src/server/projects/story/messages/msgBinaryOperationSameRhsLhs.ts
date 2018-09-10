import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export default function msgBinaryOperationSameRhsLhs(): DiagnosticMessage {
  return {
    code: DiagnosticCode.BinaryOperationSameRhsLhs,
    message: `Same variable used on both sides of a binary expression; this will result in an invalid compare in runtime`,
    severity: DiagnosticSeverity.Error
  };
}
