import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  value: string;
};

export default function msgInvalidGuidInString({
  value
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidGuidInString,
    message: `The string "${value}" containing a GUID is probably malformed, it should match the pattern "NAME_GUID"`,
    severity: DiagnosticSeverity.Warning
  };
}
