import { ParameterType } from "../models/parameter";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";
import printParameterType from "../utils/printParameterType";

export type Params = {
  name?: string;
  sourceType: ParameterType;
  targetType: ParameterType;
};

export default function msgInvalidTypeCast({
  name,
  sourceType,
  targetType
}: Params): DiagnosticMessage {
  let message: string;
  if (name) {
    message = `Rule variable "${name}" of type ${printParameterType(
      sourceType
    )} cannot be converted to ${printParameterType(targetType)}`;
  } else {
    message = `Type ${printParameterType(
      sourceType
    )} cannot be converted to ${printParameterType(targetType)}`;
  }

  return {
    code: DiagnosticCode.LocalTypeMismatch,
    message,
    severity: DiagnosticSeverity.Error
  };
}
