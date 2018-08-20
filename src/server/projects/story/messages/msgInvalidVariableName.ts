import Symbol from "../Symbol";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  name: string;
};

export default function msgInvalidVariableName({
  name
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidVariableName,
    message: `Variable name "${name}" must start with an underscore.`,
    severity: DiagnosticSeverity.Error
  };
}
