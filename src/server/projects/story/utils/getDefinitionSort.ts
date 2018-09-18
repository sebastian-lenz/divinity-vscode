import { SymbolDefinition } from "../Symbol";

export default function getDefinitionSort(
  left: SymbolDefinition,
  right: SymbolDefinition
) {
  if (left.goal.weight === right.goal.weight) {
    return left.startOffset - right.startOffset;
  }

  return left.goal.weight - right.goal.weight;
}
