import { AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { NodeType } from "../../../parsers/story/models/nodes";

export default class SyntaxErrorAnalyzer extends SyncAnalyzer {
  analyze({ node, resource }: AnalyzerContext): boolean {
    if (node.type !== NodeType.Rule && node.type !== NodeType.SignatureAction) {
      return false;
    }

    const { endOffset, startOffset } = node;
    const diagnostics = resource.getDiagnostics();
    for (const diagnostic of diagnostics) {
      if (diagnostic.startOffset > endOffset) continue;
      if (diagnostic.endOffset < startOffset) continue;
      return true;
    }

    return false;
  }
}
