import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  requiredByIndex: number;
  requiredByName: string;
};

export default function msgInvalidPlaceholder({
  requiredByIndex,
  requiredByName
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.ParamNotBound,
    message: `Placeholder used but parameter ${requiredByIndex +
      1} of ${requiredByName} is required`,
    severity: DiagnosticSeverity.Error
  };
}
