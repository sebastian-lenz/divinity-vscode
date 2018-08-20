import toParameterType from "./toParameterType";
import { ParameterNode } from "../../../parsers/story/models/nodes";
import { ParameterType } from "../models/parameter";
import getConstantParameterType from "./getConstantParameterType";

export default function getExplicitParameterType(
  node: ParameterNode
): ParameterType | null {
  if (node.valueType) {
    return toParameterType(node.valueType.annotatedType);
  }

  return getConstantParameterType(node);
}
