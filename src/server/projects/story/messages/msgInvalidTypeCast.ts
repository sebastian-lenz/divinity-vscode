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
    message = `Cannot cast ${printParameterType(
      sourceType
    )} variable "${name}" to unrelated type ${printParameterType(targetType)}`;
  } else {
    message = `Cannot cast ${printParameterType(
      sourceType
    )} to unrelated type ${printParameterType(targetType)}`;
  }

  return {
    code: DiagnosticCode.CastToUnrelatedType,
    message,
    severity: DiagnosticSeverity.Error
  };
}
