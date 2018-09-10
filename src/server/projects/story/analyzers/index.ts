import eachNodeRecursive from "../../../parsers/story/utils/eachNodeRecursive";
import GuidInStringAnalyzer from "./GuidInString";
import ParameterAnalyzer from "./Parameter";
import ParentTargetEdgeAnalyzer from "./ParentTargetEdge";
import Resource from "../resources/Resource";
import Story from "..";
import SymbolLocationsAnalyzer from "./SymbolLocations";
import SymbolTypesAnalyzer from "./SymbolTypes";
import SyntaxErrorAnalyzer from "./SyntaxError";
import { AnyAnalyzer, AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { Diagnostic } from "../../../parsers/story/models/diagnostics";
import {
  StoryGoalNode,
  AnyNode,
  NodeType
} from "../../../parsers/story/models/nodes";
import {
  isInScope,
  Scope,
  tryStartScope,
  updateScope
} from "../../../parsers/story/utils/eachRuleNode";

export default class Analyzers {
  readonly diagnostics: Array<Diagnostic> = [];
  readonly story: Story;
  readonly workers: Array<AnyAnalyzer>;

  constructor(story: Story) {
    this.story = story;
    this.workers = [
      new ParentTargetEdgeAnalyzer(this),
      new SyntaxErrorAnalyzer(this),
      new SymbolTypesAnalyzer(this),
      new SymbolLocationsAnalyzer(this),
      new ParameterAnalyzer(this),
      new GuidInStringAnalyzer(this)
    ];
  }

  async apply(
    resource: Resource,
    rootNode: StoryGoalNode
  ): Promise<Array<Diagnostic>> {
    const { workers } = this;
    let scope: Scope | null = null;
    let skipNode: AnyNode | null = null;

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

      if (skipNode) {
        if (stack.indexOf(skipNode) === -1) {
          skipNode = null;
        } else {
          continue;
        }
      }

      context.node = node;
      context.scope = scope;
      context.stack = stack;

      for (const worker of workers) {
        let didEmitDiagnostic: boolean = false;
        if (worker instanceof SyncAnalyzer) {
          didEmitDiagnostic = worker.analyze(context);
        } else if (worker.canAnalyze(context)) {
          didEmitDiagnostic = await worker.analyze(context);
        }

        if (didEmitDiagnostic && node.type !== NodeType.Rule) {
          skipNode = node;
          break;
        }
      }
    }

    return this.diagnostics.slice();
  }
}
