import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

export type Params = {
  name: string;
};

export default function msgInvalidGoalSection({
  name
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidGoalSection,
    message: `Invalid goal section "${name}".`,
    severity: DiagnosticSeverity.Error
  };
}
