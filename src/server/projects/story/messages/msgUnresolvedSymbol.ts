import { CallerNode } from "../../../parsers/story/utils/isCallerNode";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  node: CallerNode;
};

export default function msgUnresolvedSymbol({
  node
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.UnresolvedSymbol,
    message: `Symbol "${node.signature.identifier.name}" could not be resolved`,
    severity: DiagnosticSeverity.Error
  };
}
