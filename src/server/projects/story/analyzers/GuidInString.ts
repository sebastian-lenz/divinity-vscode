import { AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { NodeType } from "../../../parsers/story/models/nodes";
import msgInvalidGuidInString from "../messages/msgInvalidGuidInString";

const GUID_REGEXP = /[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$/;
const INVALID_PREFIX = /^(CHARACTERGUID|GUIDSTRING|ITEMGUID|SPLINEGUID|TRIGGERGUID)_/;

export default class GuidInStringAnalyzer extends SyncAnalyzer {
  analyze({ node }: AnalyzerContext): boolean {
    if (node.type !== NodeType.StringLiteral || !GUID_REGEXP.test(node.value)) {
      return false;
    }

    if (
      INVALID_PREFIX.test(node.value) ||
      node.value.charAt(node.value.length - 37) !== "_"
    ) {
      this.addDiagnostic(node, msgInvalidGuidInString({ value: node.value }));
    }

    return false;
  }
}
