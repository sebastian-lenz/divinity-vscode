import { AnyNode, NodeType, ParameterFlow } from "../models/nodes";

export default function printNode(node?: AnyNode | null): string {
  if (!node) {
    return "";
  }

  switch (node.type) {
    case NodeType.SignatureAction:
    case NodeType.SignatureCondition:
      return printNode(node.signature);

    case NodeType.Parameter:
      return [
        node.flow ? `[${node.flow === ParameterFlow.Out ? "out" : "in"}]` : "",
        printNode(node.valueType),
        printNode(node.argument)
      ].join("");

    case NodeType.Rule:
      return `${node.ruleType} ${printNode(node.signature)}`;

    case NodeType.Signature: {
      const name = printNode(node.identifier);
      const parameters = node.parameters
        .map(parameter => printNode(parameter))
        .join(", ");

      return `${name}(${parameters})`;
    }

    case NodeType.TypeAnnotation:
      return `(${node.annotatedType})`;

    case NodeType.RealLiteral:
    case NodeType.IntegerLiteral:
      return node.value.toString();

    case NodeType.GuidLiteral:
      return node.guid;

    case NodeType.StringLiteral:
      return node.value;

    case NodeType.Identifier:
      return node.name;

    case NodeType.GoalCompletedAction:
    case NodeType.OperatorCondition:
    case NodeType.ActionBlock:
    case NodeType.ConditionBlock:
    case NodeType.RuleBlock:
    case NodeType.Div:
    case NodeType.DivGoal:
    case NodeType.StoryGoal:
    case NodeType.Definition:
    case NodeType.ParentTragetEdge:
      return "";
  }
}
