import { Range } from "vscode-languageserver";

import Analyzers from "./index";
import isCallerNode from "../../../parsers/story/utils/isCallerNode";
import Resource from "../resources/Resource";
import unpackRange from "../../../parsers/story/utils/unpackRange";
import { Scope } from "../../../parsers/story/utils/eachRuleNode";
import { StoryGoalNode, AnyNode } from "../../../parsers/story/models/nodes";

import {
  DiagnosticType,
  DiagnosticMessage
} from "../../../parsers/story/models/diagnostics";

function resolveRange(node: AnyNode): Range {
  if (isCallerNode(node)) {
    node = node.signature.identifier;
  }

  return unpackRange(node);
}

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
    this.analyzers.diagnostics.push({
      ...message,
      range: unpackRange(range),
      type: DiagnosticType.Syntax
    });
  }
}

export abstract class SyncAnalyzer extends Analyzer {
  abstract analyze(context: AnalyzerContext): void;
}

export abstract class AsyncAnalyzer extends Analyzer {
  abstract async analyze(context: AnalyzerContext): Promise<void>;
  abstract canAnalyze(context: AnalyzerContext): boolean;
}
