import getCallerSymbolType from "./utils/getCallerSymbolType";
import getDefinitionSymbolType from "./utils/getDefinitionSymbolType";
import getParameterNameScore from "./utils/getParameterNameScore";
import Goal from "./Goal";
import parseDocComments from "./utils/parseDocComment";
import toParameters from "./utils/toParameters";
import { CallerNode } from "../../parsers/story/utils/isCallerNode";
import { EachCallerType } from "../../parsers/story/utils/eachCaller";
import { SymbolType, SymbolDoc, Variable } from "./models/symbol";
import { TokenRange } from "../../parsers/story/Lexer";

import resolveParameters, {
  ResolvePrameterResult
} from "./utils/resolveParameters";

import {
  Parameter,
  ParameterType,
  ScoredParameterName
} from "./models/parameter";

import {
  NodeType,
  IdentifierType,
  DefinitionNode,
  ParameterFlow
} from "../../parsers/story/models/nodes";
import getAnnotatedType from "./utils/getAnnotatedType";

function compareDefinition(left: SymbolDefinition, right: SymbolDefinition) {
  if (left.goal.weight === right.goal.weight) {
    return left.startOffset - right.startOffset;
  }

  return left.goal.weight - right.goal.weight;
}

export interface SymbolDefinition extends TokenRange {
  comment: string | null;
  goal: Goal;
  isInferred: boolean;
  isPartial: boolean;
  parameters: Array<Parameter>;
  type: SymbolType;
}

export default class Symbol {
  category: string | null = null;
  dbReads: Array<Goal> | null = null;
  dbWrites: Array<Goal> | null = null;
  definitions: Array<SymbolDefinition> = [];
  documentation: SymbolDoc | null = null;
  isDead: boolean = false;
  isSystem: boolean = false;
  name: string;
  needsUpdate: boolean = false;
  numParameters: number;
  parameters: Array<Parameter>;
  parameterNames: Array<ScoredParameterName>;
  resolvedDefinition: SymbolDefinition | null = null;
  searchName: string;
  type: SymbolType = SymbolType.Unknown;
  usages: Array<Goal> = [];

  constructor(name: string, numParameters: number) {
    const parameters: Array<Parameter> = [];
    const parameterNames: Array<ScoredParameterName> = [];

    for (let index = 0; index < numParameters; index++) {
      const name = `_Param${index + 1}`;
      parameterNames.push({ name, score: 0 });
      parameters.push({ name, type: ParameterType.Unknown });
    }

    this.name = name;
    this.numParameters = numParameters;
    this.parameters = parameters;
    this.parameterNames = parameterNames;
    this.searchName = name.toLowerCase();
  }

  applyTo(node: CallerNode, type: EachCallerType, variables: Array<Variable>) {
    if (type === EachCallerType.Fact) {
      return;
    }

    const { parameters } = node.signature;
    if (parameters.length !== this.numParameters) {
      throw new Error("Invalid operation.");
    }

    for (let index = 0; index < parameters.length; index++) {
      const parameter = parameters[index];
      const { argument } = parameter;
      if (
        argument.type !== NodeType.Identifier ||
        argument.identifierType !== IdentifierType.Variable
      ) {
        continue;
      }

      const definition = this.parameters[index];
      if (definition && definition.flow === ParameterFlow.In) {
        continue;
      }

      const annotatedType = getAnnotatedType(parameter.valueType);
      const name = argument.name.toLowerCase();
      const variable = {
        displayName: argument.name,
        fromIndex: index,
        fromSymbol: this,
        name,
        type: annotatedType || this.parameters[index].type
      };

      const existingIndex = variables.findIndex(
        variable => variable.name === name
      );

      if (existingIndex === -1) {
        variables.push(variable);
      }
    }
  }

  addReference(
    goal: Goal,
    node: CallerNode,
    type: EachCallerType,
    variables?: Array<Variable>
  ) {
    const { definitions, parameterNames, usages, dbReads, dbWrites } = this;
    const { identifierType } = node.signature.identifier;
    const isDefinition =
      !this.isSystem &&
      (identifierType === IdentifierType.Database ||
        type === EachCallerType.Definition);

    if (usages.indexOf(goal) === -1) {
      usages.push(goal);
    }

    if (
      identifierType === IdentifierType.Database &&
      (node.type === NodeType.Rule ||
        node.type === NodeType.SignatureCondition) &&
      (!dbReads || dbReads.indexOf(goal) === -1)
    ) {
      (dbReads || (this.dbReads = [])).push(goal);
    }

    if (
      identifierType === IdentifierType.Database &&
      node.type === NodeType.SignatureAction &&
      !node.isInverted &&
      (!dbWrites || dbWrites.indexOf(goal) === -1)
    ) {
      (dbWrites || (this.dbWrites = [])).push(goal);
    }

    const { parameters } = node.signature;
    for (let index = 0; index < parameters.length; index++) {
      const { argument } = parameters[index];
      if (
        argument.type === NodeType.Identifier &&
        argument.identifierType === IdentifierType.Variable
      ) {
        const score = getParameterNameScore(argument.name);
        if (score > parameterNames[index].score) {
          parameterNames[index].score = score;
          parameterNames[index].name = argument.name;
        }
      }
    }

    if (isDefinition && !this.hasCompleteDefinition(goal)) {
      const parameters = toParameters(this, node.signature, variables);
      definitions.push({
        ...parameters,
        comment: node.type === NodeType.Rule ? node.comment : null,
        endOffset: node.endOffset,
        endPosition: node.endPosition,
        goal,
        startOffset: node.startOffset,
        startPosition: node.startPosition,
        type: getCallerSymbolType(node)
      });

      this.needsUpdate = true;
    }
  }

  hasCompleteDefinition(target: Goal): boolean {
    return this.definitions.some(
      ({ goal, isInferred, isPartial }) =>
        goal === target && !isInferred && !isPartial
    );
  }

  isDefinedBy(goal: Goal): boolean {
    return this.definitions.some(definition => definition.goal === goal);
  }

  notifyGoalChanged(goal: Goal) {
    if (this.isDefinedBy(goal)) {
      this.needsUpdate = true;
    }
  }

  removeGoal(goal: Goal) {
    const { usages, dbReads, dbWrites } = this;
    let index = usages.indexOf(goal);
    if (index !== -1) {
      usages.splice(index, 1);
    }

    if (dbWrites) {
      index = dbWrites.indexOf(goal);
      if (index !== -1) {
        dbWrites.splice(index, 1);
      }
    }

    if (dbReads) {
      index = dbReads.indexOf(goal);
      if (index !== -1) {
        dbReads.splice(index, 1);
      }
    }

    if (this.isDefinedBy(goal)) {
      this.definitions = this.definitions.filter(
        definition => definition.goal !== goal
      );

      this.needsUpdate = true;
    }
  }

  resetParameters() {
    if (this.isSystem) {
      console.error("Trying to reset system definition.");
      return;
    }

    const { numParameters, parameterNames } = this;
    const parameters: Array<Parameter> = [];

    for (let index = 0; index < numParameters; index++) {
      parameters.push({
        name: parameterNames[index].name,
        type: ParameterType.Unknown
      });
    }

    this.parameters = parameters;
    this.resolvedDefinition = null;
  }

  toSystemSymbol(definition: DefinitionNode) {
    const { parameters } = toParameters(this, definition.signature);

    this.isSystem = true;
    this.parameters = parameters;
  }

  update() {
    const { definitions, isSystem, dbWrites } = this;
    if (isSystem) {
      console.error("Trying to rebuild system definition.");
      this.needsUpdate = false;
      return;
    }

    definitions.sort(compareDefinition);
    let deadCounter = 0;
    this.type = SymbolType.Unknown;

    for (const definition of definitions) {
      const parameters = resolveParameters(this, definition);
      if (Array.isArray(parameters)) {
        this.isDead = false;
        this.needsUpdate = false;
        this.parameters = parameters;
        this.resolvedDefinition = definition;
        this.type = definition.type;
        this.documentation = definition.comment
          ? parseDocComments(definition.comment)
          : null;

        return;
      }

      if (this.type === SymbolType.Unknown) {
        this.type = definition.type;
      }

      if (parameters === ResolvePrameterResult.Dead) {
        deadCounter += 1;
      }
    }

    if (
      this.type === SymbolType.Database &&
      (!dbWrites || dbWrites.length === 0 || deadCounter === definitions.length)
    ) {
      this.isDead = true;
      this.needsUpdate = false;
    }

    this.resetParameters();
  }

  static fromCaller(caller: CallerNode): Symbol {
    const { signature } = caller;
    const symbol = new Symbol(
      signature.identifier.name,
      signature.parameters.length
    );

    return symbol;
  }

  static fromDefinition(definition: DefinitionNode): Symbol {
    const { signature } = definition;
    const symbol = new Symbol(
      signature.identifier.name,
      signature.parameters.length
    );

    symbol.type = getDefinitionSymbolType(definition);
    symbol.toSystemSymbol(definition);
    return symbol;
  }
}
