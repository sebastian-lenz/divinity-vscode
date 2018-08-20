import { AnyNode, NodeType } from "../models/nodes";

export default function* eachNode(parent?: AnyNode): Iterable<AnyNode> {
  if (!parent) {
    return;
  }

  switch (parent.type) {
    case NodeType.ActionBlock:
      for (let index = 0; index < parent.actions.length; index++) {
        yield parent.actions[index];
      }
      break;

    case NodeType.ConditionBlock:
      for (let index = 0; index < parent.conditions.length; index++) {
        yield parent.conditions[index];
      }
      break;

    case NodeType.OperatorCondition:
      yield parent.leftOperant;
      yield parent.rightOperant;
      break;

    case NodeType.Div:
      for (let index = 0; index < parent.definitions.length; index++) {
        yield parent.definitions[index];
      }
      for (let index = 0; index < parent.goals.length; index++) {
        yield parent.goals[index];
      }
      break;

    case NodeType.StoryGoal:
      if (parent.init) yield parent.init;
      if (parent.kb) yield parent.kb;
      if (parent.exit) yield parent.exit;
      break;

    case NodeType.SignatureAction:
    case NodeType.SignatureCondition: {
      yield parent.signature;
      break;
    }

    case NodeType.Parameter:
      if (parent.valueType) yield parent.valueType;
      if (parent.argument) yield parent.argument;
      break;

    case NodeType.Rule: {
      yield parent.signature;
      if (parent.conditions) yield parent.conditions;
      if (parent.body) yield parent.body;
      break;
    }

    case NodeType.RuleBlock:
      for (let index = 0; index < parent.rules.length; index++) {
        yield parent.rules[index];
      }
      break;

    case NodeType.Signature:
      yield parent.identifier;
      for (let index = 0; index < parent.parameters.length; index++) {
        yield parent.parameters[index];
      }
      break;
  }
}
