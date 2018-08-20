import printParameterType from "../utils/printParameterType";
import { ParameterType } from "../models/parameter";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  sourceType: ParameterType;
  targetType: ParameterType;
};

export default function msgDangerousCast({
  sourceType,
  targetType
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.GuidAliasMismatch,
    message: `GUID alias cast: Type ${printParameterType(
      sourceType
    )} converted to ${printParameterType(targetType)}`,
    severity: DiagnosticSeverity.Warning
  };
}
