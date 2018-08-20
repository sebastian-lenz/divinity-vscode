import msgComparisonTypeMismatch from "../messages/msgComparisonTypeMismatch";
import msgInvalidPlaceholder from "../messages/msgInvalidPlaceholder";
import msgInvalidTypeCast from "../messages/msgInvalidTypeCast";
import msgInvalidVariableName from "../messages/msgInvalidVariableName";
import msgParameterTypeMismatch from "../messages/msgParameterTypeMismatch";
import msgStringLtGtComparison from "../messages/msgStringLtGtComparison";
import msgVariableNotAllowed from "../messages/msgVariableNotAllowed";
import msgVariableNotBound from "../messages/msgVariableNotBound";
import Symbol from "../Symbol";
import { AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { ArgumentNode } from "../../../parsers/story/utils/isArgumentNode";
import { ParameterType, Parameter } from "../models/parameter";
import { Scope } from "../../../parsers/story/utils/eachRuleNode";
import { SymbolType, Variable } from "../models/symbol";

import isCallerNode, {
  CallerNode
} from "../../../parsers/story/utils/isCallerNode";

import {
  NodeType,
  TypeAnnotationNode,
  ParameterFlow,
  IdentifierType,
  ParameterNode,
  OperatorNode
} from "../../../parsers/story/models/nodes";
import msgDangerousCast from "../messages/msgDangerousCast";
import getAnnotatedType from "../utils/getAnnotatedType";

const enum ArgumentMode {
  Constant,
  Placeholder,
  Variable
}

function isDangerousCast(from: ParameterType, to: ParameterType): boolean {
  return from !== to && isGuidSubtype(from) && isGuidSubtype(to);
}

function isGuidType(type: ParameterType): boolean {
  return type === ParameterType.Guid || isGuidSubtype(type);
}

function isGuidSubtype(type: ParameterType): boolean {
  return (
    type === ParameterType.CharacterGuid ||
    type === ParameterType.ItemGuid ||
    type === ParameterType.LevelTemplateGuid ||
    type === ParameterType.SplineGuid ||
    type === ParameterType.TriggerGuid
  );
}

function isIntegerType(type: ParameterType): boolean {
  return type === ParameterType.Integer || type === ParameterType.Integer64;
}

function isNumericType(type: ParameterType): boolean {
  return (
    type === ParameterType.Integer ||
    type === ParameterType.Integer64 ||
    type === ParameterType.Real
  );
}

function isNumericOperator(operator: string) {
  return (
    operator === ">" ||
    operator === ">=" ||
    operator === "<" ||
    operator === "<="
  );
}

function castType(
  from: ParameterType,
  to: ParameterType,
  allowNumericCast?: boolean
): ParameterType {
  if (from === to) return from;
  if (isGuidType(from) && isGuidType(to)) return to;
  if (isIntegerType(from) && isIntegerType(to)) return to;
  if (isNumericType(from) && isNumericType(to)) return to;

  return ParameterType.Invalid;
}

function getArgumentType(
  node: ArgumentNode,
  scopeOrType: Scope | ParameterType | null
): ParameterType {
  switch (node.type) {
    case NodeType.RealLiteral:
      return ParameterType.Real;
    case NodeType.GuidLiteral:
      return ParameterType.Guid;
    case NodeType.IntegerLiteral:
      return ParameterType.Integer;
    case NodeType.StringLiteral:
      return ParameterType.String;
    case NodeType.Identifier:
      if (scopeOrType && typeof scopeOrType === "object") {
        const variable = scopeOrType.variablesBefore.find(
          variable => variable.name === node.name.toLowerCase()
        );

        if (variable && variable.type) {
          return variable.type;
        }
      } else if (typeof scopeOrType === "number") {
        return scopeOrType;
      }

      return ParameterType.Unknown;
  }
}

export default class ParameterAnalyzer extends SyncAnalyzer {
  analyze({ node, scope }: AnalyzerContext) {
    if (node.type === NodeType.OperatorCondition) {
      this.analyzeOperator(scope, node);
    } else if (isCallerNode(node) && node.symbol) {
      const { symbol } = node;
      const { parameters } = node.signature;
      const definitions = symbol.parameters;

      if (definitions.length !== parameters.length) {
        return;
      }

      for (let index = 0; index < definitions.length; index++) {
        this.analyzeParameter(
          scope,
          node,
          symbol,
          definitions[index],
          parameters[index],
          index
        );
      }
    }
  }

  analyzeOperator(scope: Scope | null, operator: OperatorNode) {
    const isLeftValid = this.isValidArgument(scope, operator.leftOperant);
    const isRightValid = this.isValidArgument(scope, operator.rightOperant);
    if (!isLeftValid || !isRightValid) {
      return;
    }

    const leftType = this.resolveArgumentType(
      scope,
      operator.leftOperant,
      operator.leftType
    );

    const rightType = this.resolveArgumentType(
      scope,
      operator.rightOperant,
      operator.rightType
    );

    if (
      leftType === ParameterType.Invalid ||
      rightType === ParameterType.Invalid
    ) {
      return;
    }

    if (castType(leftType, rightType, true) === ParameterType.Invalid) {
      return this.addDiagnostic(
        operator,
        msgComparisonTypeMismatch({ leftType, rightType })
      );
    }

    if (isDangerousCast(leftType, rightType)) {
      this.addDiagnostic(
        operator,
        msgDangerousCast({
          sourceType: leftType,
          targetType: rightType
        })
      );
    }

    if (
      (!isNumericType(leftType) || !isNumericType(rightType)) &&
      isNumericOperator(operator.operator)
    ) {
      this.addDiagnostic(
        operator,
        msgStringLtGtComparison({
          operator: operator.operator
        })
      );
    }
  }

  analyzeParameter(
    scope: Scope | null,
    node: CallerNode,
    symbol: Symbol,
    definition: Parameter,
    parameter: ParameterNode,
    index: number
  ) {
    // Fetch inbound variable
    let mode: ArgumentMode;
    let variableName: string | undefined;
    let variable: Variable | undefined;

    if (parameter.argument.type === NodeType.Identifier) {
      if (parameter.argument.identifierType === IdentifierType.Empty) {
        mode = ArgumentMode.Placeholder;
      } else if (
        parameter.argument.identifierType !== IdentifierType.Variable
      ) {
        return this.addDiagnostic(
          parameter,
          msgInvalidVariableName({ name: parameter.argument.name })
        );
      } else if (scope) {
        const searchName = parameter.argument.name.toLowerCase();
        variableName = parameter.argument.name;
        mode = ArgumentMode.Variable;
        variable = scope.variablesBefore.find(
          variable => variable.name === searchName
        );
      } else {
        return this.addDiagnostic(
          parameter,
          msgVariableNotAllowed({ name: parameter.argument.name })
        );
      }
    } else {
      mode = ArgumentMode.Constant;
    }

    // Determine the value flow
    let allowPlaceholders = true;
    let flow = definition.flow;
    if (!flow) {
      if (symbol.type === SymbolType.Call || symbol.type === SymbolType.Query) {
        if (node.type === NodeType.Rule) {
          flow =
            mode === ArgumentMode.Variable
              ? ParameterFlow.Out
              : ParameterFlow.In;
        } else {
          allowPlaceholders = false;
          flow = ParameterFlow.In;
        }
      } else if (symbol.type === SymbolType.Database) {
        if (
          node.type === NodeType.SignatureAction ||
          (node.type === NodeType.SignatureCondition && node.isInverted)
        ) {
          flow = ParameterFlow.In;
        } else {
          flow = variable ? ParameterFlow.In : ParameterFlow.Out;
        }
      } else {
        flow = variable ? ParameterFlow.In : ParameterFlow.Out;
      }
    }

    // Bail out for placeholders
    if (mode === ArgumentMode.Placeholder) {
      if (!allowPlaceholders) {
        this.addDiagnostic(
          parameter,
          msgInvalidPlaceholder({
            requiredByIndex: index,
            requiredByName: symbol.name
          })
        );
      }

      return;
    }

    // If the flow is inbound, bail out if no value is given
    if (
      flow === ParameterFlow.In &&
      mode === ArgumentMode.Variable &&
      !variable
    ) {
      return this.addDiagnostic(
        parameter,
        msgVariableNotBound({
          name: `${variableName}`,
          requiredByIndex: index,
          requiredByName: symbol.name
        })
      );
    }

    // Check the type cast
    const parameterType = this.resolveArgumentType(
      flow === ParameterFlow.Out ? definition.type : scope,
      parameter.argument,
      parameter.valueType
    );

    // Bail out if the flow is outbound
    if (flow === ParameterFlow.Out) {
      return;
    }

    // Check the type required by the definition
    if (castType(parameterType, definition.type) === ParameterType.Invalid) {
      this.addDiagnostic(
        parameter,
        msgParameterTypeMismatch({
          sourceType: parameterType,
          symbol,
          targetIndex: index,
          targetType: definition.type
        })
      );
    } else if (isDangerousCast(parameterType, definition.type)) {
      this.addDiagnostic(
        parameter,
        msgDangerousCast({
          sourceType: parameterType,
          targetType: definition.type
        })
      );
    }
  }

  resolveArgumentType(
    scope: Scope | ParameterType | null,
    argument: ArgumentNode,
    typeAnnotation?: TypeAnnotationNode
  ): ParameterType {
    const argumentType = getArgumentType(argument, scope);
    let result = argumentType;

    const annotatedType = getAnnotatedType(typeAnnotation);
    if (!typeAnnotation || annotatedType === null) {
      return result;
    }

    result = castType(result, annotatedType);
    if (result === ParameterType.Invalid) {
      result = annotatedType;

      this.addDiagnostic(
        typeAnnotation,
        msgInvalidTypeCast({
          name:
            argument.type === NodeType.Identifier ? argument.name : undefined,
          sourceType: argumentType,
          targetType: annotatedType
        })
      );
    }

    return result;
  }

  isValidArgument(scope: Scope | null, argument: ArgumentNode): boolean {
    if (argument.type === NodeType.Identifier) {
      const { name } = argument;

      if (!scope) {
        this.addDiagnostic(argument, msgVariableNotAllowed({ name }));
        return false;
      }

      const variable = scope.variables.find(
        variable => variable.name === argument.name.toLowerCase()
      );

      if (!variable) {
        this.addDiagnostic(argument, msgVariableNotBound({ name }));
        return false;
      }
    }

    return true;
  }
}
