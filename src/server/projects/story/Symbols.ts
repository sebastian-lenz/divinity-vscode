import { get as levenshtein } from "fast-levenshtein";

import eachCaller from "../../parsers/story/utils/eachCaller";
import Goal from "./Goal";
import Story from "./index";
import Symbol from "./Symbol";
import { SymbolDoc } from "./models/symbol";

import {
  SignatureNode,
  DefinitionNode,
  HeaderGoalNode,
  StoryGoalNode
} from "../../parsers/story/models/nodes";

export default class Symbols {
  readonly story: Story;
  readonly symbols: Array<Symbol> = [];

  constructor(story: Story) {
    this.story = story;
  }

  addSystemSymbol(definition: DefinitionNode) {
    let symbol = this.findSymbolForSignature(definition.signature);
    if (!symbol) {
      symbol = Symbol.fromDefinition(this, definition);
      this.symbols.push(symbol);
    } else {
      symbol.toSystemSymbol(definition);
    }
  }

  assignSymbols(rootNode: HeaderGoalNode | StoryGoalNode) {
    for (const { node } of eachCaller(rootNode)) {
      if (node.symbol) {
        continue;
      }

      let symbol = this.findSymbolForSignature(node.signature);
      if (symbol) {
        node.symbol = symbol;
      }
    }
  }

  findSimiliarSymbols(name: string): Array<Symbol> {
    name = name.toLowerCase();
    return this.symbols.filter(
      symbol => levenshtein(symbol.searchName, name) < 4
    );
  }

  findSymbol(name: string, numParameters: number): Symbol | null {
    name = name.toLowerCase();
    return (
      this.symbols.find(
        symbol =>
          symbol.searchName === name && symbol.numParameters === numParameters
      ) || null
    );
  }

  findSymbolWithMostParameters(name: string): Symbol | null {
    let result: Symbol | null = null;
    for (const symbol of this.symbols) {
      if (
        symbol.name === name &&
        (!result || symbol.numParameters > result.numParameters)
      ) {
        result = symbol;
      }
    }

    return result;
  }

  findSymbols(name: string): Array<Symbol> {
    name = name.toLowerCase();
    return this.symbols.filter(symbol => symbol.searchName === name);
  }

  findSymbolForSignature(signature: SignatureNode): Symbol | null {
    return this.findSymbol(
      signature.identifier.name,
      signature.parameters.length
    );
  }

  async getDocumentation(symbol: Symbol): Promise<SymbolDoc | null> {
    if (symbol.documentation) {
      return symbol.documentation;
    }

    const { docProvider } = this.story.project.projects;
    return await docProvider.getDocumentation(symbol.name);
  }

  async loadMetaData() {
    const { docProvider } = this.story.project.projects;
    const categories = await docProvider.getSymbolCategories();
    if (!categories) return;

    for (const symbol of this.symbols) {
      if (symbol.searchName in categories) {
        symbol.category = categories[symbol.searchName];
      }
    }
  }

  notifyGoalChanged(goal: Goal) {
    for (const symbol of this.symbols) {
      symbol.notifyGoalChanged(goal);
    }
  }

  updateGoal(goal: Goal, rootNode: HeaderGoalNode | StoryGoalNode) {
    this.removeByGoal(goal);
    this.story.enumerations.removeByGoal(goal);

    for (const { node, type, variables } of eachCaller(rootNode)) {
      let symbol = this.findSymbolForSignature(node.signature);
      if (!symbol) {
        symbol = Symbol.fromCaller(this, node);
        this.symbols.push(symbol);
      }

      symbol.addReference(goal, node, type, variables);
      if (variables) {
        symbol.applyTo(node, type, variables);
      }

      node.symbol = symbol;
    }
  }

  removeByGoal(goal: Goal) {
    const { symbols } = this;
    for (const symbol of symbols) {
      symbol.removeGoal(goal);
    }
  }

  update() {
    if (this.story.isInitializing) {
      return;
    }

    const revisit: Array<Symbol> = [];
    const { symbols } = this;
    let index = 0;
    while (index < symbols.length) {
      const symbol = symbols[index];
      if (
        !symbol.definitions.length &&
        !symbol.usages.length &&
        !symbol.isSystem
      ) {
        symbols.splice(index, 1);
        continue;
      } else {
        index += 1;
      }

      if (symbol.needsUpdate) {
        symbol.update();
      }

      if (symbol.needsUpdate) {
        revisit.push(symbol);
      }
    }

    for (const symbol of revisit) {
      symbol.update();
    }
  }
}
