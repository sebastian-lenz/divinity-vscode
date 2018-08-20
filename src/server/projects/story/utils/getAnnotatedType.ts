import { TypeAnnotationNode } from "../../../parsers/story/models/nodes";
import { ParameterType } from "../models/parameter";
import toParameterType from "./toParameterType";

export default function getAnnotatedType(
  node?: TypeAnnotationNode
): ParameterType | null {
  if (!node || !node.annotatedType) {
    return null;
  }

  const result = toParameterType(node.annotatedType);
  return result === ParameterType.Unknown ? null : result;
}
