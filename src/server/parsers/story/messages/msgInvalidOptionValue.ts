import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

export type Params = {
  actualValue: string;
  expectedValue: string;
  name: string;
};

export default function msgInvalidOptionValue({
  actualValue,
  expectedValue,
  name
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidOptionValue,
    message: `Invalid value "${actualValue}" for option "${name}", expected "${expectedValue}".`,
    severity: DiagnosticSeverity.Error
  };
}
