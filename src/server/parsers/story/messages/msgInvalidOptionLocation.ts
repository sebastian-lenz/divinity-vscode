import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

export type Params = {
  isHeader: boolean;
  name: string;
};

export default function msgInvalidOptionLocation({
  name,
  isHeader
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.InvalidOptionLocation,
    message: `Invalid location of option "${name}": The option must be placed in the ${
      isHeader ? "header" : "footer"
    } of the file.`,
    severity: DiagnosticSeverity.Error
  };
}
