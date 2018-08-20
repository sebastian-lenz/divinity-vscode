import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  name: string;
  requiredByIndex?: number;
  requiredByName?: string;
};

export default function msgVariableNotBound({
  name,
  requiredByIndex,
  requiredByName
}: Params): DiagnosticMessage {
  let message = `Variable ${name} is not bound`;
  if (requiredByIndex && requiredByName) {
    message += ` but parameter ${requiredByIndex +
      1} of ${requiredByName} is required`;
  }

  return {
    code: DiagnosticCode.ParamNotBound,
    message,
    severity: DiagnosticSeverity.Error
  };
}
