import {
  AnyNode,
  GuidLiteralNode,
  NumericLiteralNode,
  StringLiteralNode,
  IdentifierNode,
  NodeType
} from "../models/nodes";

export type ArgumentNode =
  | GuidLiteralNode
  | IdentifierNode
  | NumericLiteralNode
  | StringLiteralNode;

export default function isArgumentNode(node: AnyNode): node is ArgumentNode {
  return (
    node.type === NodeType.GuidLiteral ||
    node.type === NodeType.Identifier ||
    node.type === NodeType.RealLiteral ||
    node.type === NodeType.IntegerLiteral ||
    node.type === NodeType.StringLiteral
  );
}
