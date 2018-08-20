import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  name: string;
};

export default function msgVariableNotAllowed({
  name
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.VariableNotAllowed,
    message: `Variable "${name}" is not allowed in this context.`,
    severity: DiagnosticSeverity.Error
  };
}
