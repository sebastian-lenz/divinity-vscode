import isCallerNode from "../../../parsers/story/utils/isCallerNode";
import msgInvalidEnumValue from "../messages/msgInvalidEnumValue";
import { AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { NodeType } from "../../../parsers/story/models/nodes";

export default class EnumerationAnalyzer extends SyncAnalyzer {
  analyze({ node, stack }: AnalyzerContext): boolean {
    if (
      node.type !== NodeType.IntegerLiteral &&
      node.type !== NodeType.StringLiteral
    ) {
      return false;
    }

    const signature = stack[stack.length - 2];
    const caller = stack[stack.length - 3];
    if (
      !caller ||
      !signature ||
      !isCallerNode(caller) ||
      !caller.symbol ||
      signature.type !== NodeType.Signature
    ) {
      return false;
    }

    const index = signature.parameters.findIndex(
      parameter => parameter.argument === node
    );

    if (index === -1) {
      return false;
    }

    if (node.value === "") {
      return false;
    }

    const { enumeration } = caller.symbol.parameters[index];
    if (!enumeration || !enumeration.fixed) {
      return false;
    }

    if (!enumeration.values.some(item => item.value === node.value)) {
      this.addDiagnostic(
        node,
        msgInvalidEnumValue({ enumeration, value: node.value })
      );
      return true;
    }

    return false;
  }
}
