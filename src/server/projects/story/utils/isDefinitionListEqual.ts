import getDefinitionSort from "./getDefinitionSort";
import { SymbolDefinition } from "../Symbol";
import { Parameter } from "../models/parameter";

function isParameterEqual(left: Parameter, right: Parameter): boolean {
  return (
    left.enumeration === right.enumeration &&
    left.flow === right.flow &&
    left.name === right.name &&
    left.type === right.type
  );
}

function isDefinitionEqual(
  left: SymbolDefinition,
  right: SymbolDefinition
): boolean {
  return (
    left.comment === right.comment &&
    left.goal === right.goal &&
    left.isInferred === right.isInferred &&
    left.isPartial === right.isPartial &&
    left.type === right.type &&
    left.parameters.length === right.parameters.length &&
    left.parameters.every((param, index) =>
      isParameterEqual(param, right.parameters[index])
    )
  );
}

export default function isDefinitionListEqual(
  left: Array<SymbolDefinition> | null | undefined,
  right: Array<SymbolDefinition> | null | undefined
): boolean {
  if (!left && !right) return true;
  if (!left || !right || left.length !== right.length) return false;

  left.sort(getDefinitionSort);
  right.sort(getDefinitionSort);

  for (let index = 0; index < left.length; index++) {
    if (!isDefinitionEqual(left[index], right[index])) {
      return false;
    }
  }

  return true;
}
