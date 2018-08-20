import { ParameterNode, NodeType } from "../../../parsers/story/models/nodes";
import { ParameterType } from "../models/parameter";

export default function getConstantParameterType(
  node: ParameterNode
): ParameterType | null {
  switch (node.argument.type) {
    case NodeType.RealLiteral:
      return ParameterType.Real;

    case NodeType.GuidLiteral:
      return ParameterType.Guid;

    case NodeType.IntegerLiteral:
      return ParameterType.Integer;

    case NodeType.StringLiteral:
      return ParameterType.String;
  }

  return null;
}
