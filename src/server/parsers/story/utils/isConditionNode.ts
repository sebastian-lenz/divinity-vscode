import {
  AnyNode,
  NodeType,
  OperatorNode,
  SignatureCallNode
} from "../models/nodes";

export type ConditionNode = OperatorNode | SignatureCallNode;

export default function isConditionNode(node?: AnyNode): node is ConditionNode {
  return (
    !!node &&
    (node.type === NodeType.OperatorCondition ||
      node.type === NodeType.SignatureCondition)
  );
}
