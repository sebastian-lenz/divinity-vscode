import toParameterType from "../../../projects/story/utils/toParameterType";
import { ActionNode } from "./isActionNode";
import { ConditionNode } from "./isConditionNode";
import { EachCallerType } from "./eachCaller";
import { ParameterType } from "../../../projects/story/models/parameter";
import { AnyNode, NodeType, RuleNode, SignatureNode } from "../models/nodes";
import { Variable } from "../../../projects/story/models/symbol";

export interface Scope {
  origin: RuleNode;
  variablesBefore: Array<Variable>;
  variables: Array<Variable>;
}

export interface EachRuleNode extends Scope {
  node: ActionNode | ConditionNode | RuleNode;
  type: EachCallerType;
}

function applyTypeCasts(variables: Array<Variable>, signature: SignatureNode) {
  for (const parameter of signature.parameters) {
    const { argument, valueType } = parameter;
    if (argument.type !== NodeType.Identifier || !valueType) {
      continue;
    }

    const variable = variables.find(
      variable => variable.name === argument.name.toLocaleLowerCase()
    );

    const type = toParameterType(valueType.annotatedType);
    if (variable && type !== ParameterType.Unknown) {
      variable.type = type;
    }
  }
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

  applyTypeCasts(variables, origin.signature);

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
    applyTypeCasts(scope.variables, node.signature);
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

  scope.variablesBefore = scope.variables;

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
