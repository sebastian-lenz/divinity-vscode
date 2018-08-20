import {
  AnyNode,
  GoalCompletedNode,
  NodeType,
  SignatureCallNode
} from "../models/nodes";

export type ActionNode = GoalCompletedNode | SignatureCallNode;

export default function isActionNode(node?: AnyNode): node is ActionNode {
  return (
    !!node &&
    (node.type === NodeType.GoalCompletedAction ||
      node.type === NodeType.SignatureAction)
  );
}
