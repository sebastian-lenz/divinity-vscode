import eachNodeRecursive from "../../../parsers/story/utils/eachNodeRecursive";
import Resource from "../resources/Resource";
import Story from "..";
import SymbolLocationsAnalyzer from "./SymbolLocations";
import SymbolTypesAnalyzer from "./SymbolTypes";
import { AnyAnalyzer, AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { Diagnostic } from "../../../parsers/story/models/diagnostics";
import { StoryGoalNode } from "../../../parsers/story/models/nodes";
import {
  isInScope,
  Scope,
  tryStartScope,
  updateScope
} from "../../../parsers/story/utils/eachRuleNode";
import ParameterAnalyzer from "./Parameter";

export default class Analyzers {
  readonly diagnostics: Array<Diagnostic> = [];
  readonly story: Story;
  readonly workers: Array<AnyAnalyzer>;

  constructor(story: Story) {
    this.story = story;
    this.workers = [
      new SymbolTypesAnalyzer(this),
      new SymbolLocationsAnalyzer(this),
      new ParameterAnalyzer(this)
    ];
  }

  async apply(
    resource: Resource,
    rootNode: StoryGoalNode
  ): Promise<Array<Diagnostic>> {
    const { workers } = this;
    let scope: Scope | null = null;

    const context: AnalyzerContext = {
      node: rootNode,
      resource,
      rootNode,
      scope: null,
      stack: []
    };

    this.diagnostics.length = 0;

    for (const { node, stack } of eachNodeRecursive(rootNode)) {
      if (scope && !isInScope(scope, stack)) scope = null;
      scope = scope ? updateScope(scope, node) : tryStartScope(node);

      context.node = node;
      context.scope = scope;
      context.stack = stack;

      for (const worker of workers) {
        if (worker instanceof SyncAnalyzer) {
          worker.analyze(context);
        } else if (worker.canAnalyze(context)) {
          await worker.analyze(context);
        }
      }
    }

    return this.diagnostics.slice();
  }
}
