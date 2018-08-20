import { ActionNode } from "./isActionNode";
import { ConditionNode } from "./isConditionNode";
import { RuleNode, NodeType, AnyNode } from "../models/nodes";
import { Variable } from "../../../projects/story/models/symbol";
import { EachCallerType } from "./eachCaller";

export interface Scope {
  origin: RuleNode;
  variablesBefore: Array<Variable>;
  variables: Array<Variable>;
}

export interface EachRuleNode extends Scope {
  node: ActionNode | ConditionNode | RuleNode;
  type: EachCallerType;
}

function getRuleCallerType(rule: RuleNode) {
  return rule.ruleType === "IF"
    ? EachCallerType.Event
    : EachCallerType.Definition;
}

export function isInScope(scope: Scope, stack: Array<AnyNode>): boolean {
  return stack.indexOf(scope.origin) !== -1;
}

export function startScope(origin: RuleNode): Scope {
  const variables: Array<Variable> = [];
  if (origin.symbol) {
    origin.symbol.applyTo(origin, getRuleCallerType(origin), variables);
  }

  return {
    origin,
    variablesBefore: [],
    variables
  };
}

export function tryStartScope(node: AnyNode): Scope | null {
  return node.type === NodeType.Rule ? startScope(node) : null;
}

export function updateScope(scope: Scope, node: AnyNode): Scope {
  if (node.type === NodeType.SignatureCondition && node.symbol) {
    scope.variablesBefore = [...scope.variables];
    node.symbol.applyTo(node, EachCallerType.Condition, scope.variables);
  } else {
    scope.variablesBefore = scope.variables;
  }

  return scope;
}

export default function* eachRuleNode(rule: RuleNode): Iterable<EachRuleNode> {
  let scope = startScope(rule);
  yield {
    ...scope,
    node: rule,
    type: getRuleCallerType(rule)
  };

  if (rule.conditions) {
    for (const node of rule.conditions.conditions) {
      updateScope(scope, node);
      yield {
        ...scope,
        node,
        type: EachCallerType.Condition
      };
    }
  }

  if (rule.body) {
    for (const node of rule.body.actions) {
      yield {
        ...scope,
        node,
        type: EachCallerType.Fact
      };
    }
  }
}
