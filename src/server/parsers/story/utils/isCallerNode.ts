import {
  RuleNode,
  SignatureCallNode,
  AnyNode,
  NodeType
} from "../models/nodes";

export type CallerNode = RuleNode | SignatureCallNode;

export default function isCallerNode(node?: AnyNode): node is CallerNode {
  return (
    !!node &&
    (node.type === NodeType.Rule ||
      node.type === NodeType.SignatureAction ||
      node.type === NodeType.SignatureCondition)
  );
}
