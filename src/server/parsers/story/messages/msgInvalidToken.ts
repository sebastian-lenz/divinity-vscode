import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

export type Params = {
  value: string;
};

export default function msgInvalidToken({ value }: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidToken,
    message: `Invalid token "${value}"`,
    severity: DiagnosticSeverity.Error
  };
}
