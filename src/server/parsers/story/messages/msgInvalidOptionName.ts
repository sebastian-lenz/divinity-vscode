import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

export type Params = {
  name: string;
};

export default function msgInvalidOptionName({
  name
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidOptionName,
    message: `Invalid option name "${name}".`,
    severity: DiagnosticSeverity.Error
  };
}
