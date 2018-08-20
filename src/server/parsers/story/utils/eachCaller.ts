import eachNodeRecursive from "./eachNodeRecursive";
import isCallerNode, { CallerNode } from "./isCallerNode";
import { AnyNode, NodeType, RuleNode } from "../models/nodes";
import { Variable } from "../../../projects/story/models/symbol";

export interface EachCaller {
  node: CallerNode;
  stack: Array<AnyNode>;
  type: EachCallerType;
  variables?: Array<Variable>;
}

export const enum EachCallerType {
  Condition,
  Definition,
  Event,
  Fact
}

export default function* eachCaller(
  parent: AnyNode | null
): Iterable<EachCaller> {
  if (!parent) {
    return;
  }

  let rule: RuleNode | undefined;
  let variables: Array<Variable> | undefined;

  for (const { node, stack } of eachNodeRecursive(parent)) {
    if (!isCallerNode(node)) continue;

    const depth = stack.length;
    let type: EachCallerType;
    if (node.type === NodeType.Rule) {
      rule = node;
      variables = [];
      if (node.ruleType === "IF") {
        type = EachCallerType.Event;
      } else {
        type = EachCallerType.Definition;
      }
    } else if (depth < 2 || stack[depth - 2] !== rule) {
      rule = undefined;
      variables = undefined;
      type = EachCallerType.Fact;
    } else {
      type =
        stack[depth - 1].type === NodeType.ConditionBlock
          ? EachCallerType.Condition
          : EachCallerType.Fact;
    }

    yield { node, stack, type, variables };
  }
}
