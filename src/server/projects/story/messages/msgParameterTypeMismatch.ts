import printParameterType from "../utils/printParameterType";
import printSymbolType from "../utils/printSymbolType";
import Symbol from "../Symbol";
import { ParameterType } from "../models/parameter";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  sourceType: ParameterType;
  symbol: Symbol;
  targetIndex: number;
  targetType: ParameterType;
};

export default function msgParameterTypeMismatch({
  sourceType,
  symbol,
  targetIndex,
  targetType
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.LocalTypeMismatch,
    message: `Parameter ${targetIndex + 1} of ${printSymbolType(symbol)} "${
      symbol.name
    }" expects ${printParameterType(targetType)}; ${printParameterType(
      sourceType
    )} specified`,
    severity: DiagnosticSeverity.Error
  };
}
