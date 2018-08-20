import Analyzers from "./index";
import isCallerNode from "../../../parsers/story/utils/isCallerNode";
import Resource from "../resources/Resource";
import { Scope } from "../../../parsers/story/utils/eachRuleNode";
import { StoryGoalNode, AnyNode } from "../../../parsers/story/models/nodes";

import {
  DiagnosticType,
  DiagnosticMessage
} from "../../../parsers/story/models/diagnostics";

export type AnyAnalyzer = SyncAnalyzer | AsyncAnalyzer;

export interface AnalyzerContext {
  node: AnyNode;
  resource: Resource;
  rootNode: StoryGoalNode;
  scope: Scope | null;
  stack: Array<AnyNode>;
}

export abstract class Analyzer {
  readonly analyzers: Analyzers;

  constructor(analyzers: Analyzers) {
    this.analyzers = analyzers;
  }

  addDiagnostic(range: AnyNode, message: DiagnosticMessage) {
    if (isCallerNode(range)) {
      range = range.signature.identifier;
    }

    this.analyzers.diagnostics.push({
      ...message,
      endOffset: range.endOffset,
      endPosition: range.endPosition,
      startOffset: range.startOffset,
      startPosition: range.startPosition,
      type: DiagnosticType.Syntax
    });
  }
}

export abstract class SyncAnalyzer extends Analyzer {
  abstract analyze(context: AnalyzerContext): boolean;
}

export abstract class AsyncAnalyzer extends Analyzer {
  abstract async analyze(context: AnalyzerContext): Promise<boolean>;
  abstract canAnalyze(context: AnalyzerContext): boolean;
}
