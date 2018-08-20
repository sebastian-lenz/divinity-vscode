import { ParameterType } from "../models/parameter";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";
import printParameterType from "../utils/printParameterType";

export type Params = {
  leftType: ParameterType;
  rightType: ParameterType;
};

export default function msgComparisonTypeMismatch({
  leftType,
  rightType
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.LocalTypeMismatch,
    message: `Type of left expression (${printParameterType(
      leftType
    )}) differs from type of right expression (${printParameterType(
      rightType
    )})`,
    severity: DiagnosticSeverity.Error
  };
}
