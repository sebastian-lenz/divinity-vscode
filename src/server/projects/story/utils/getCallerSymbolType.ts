import { CallerNode } from "../../../parsers/story/utils/isCallerNode";
import { NodeType, IdentifierType } from "../../../parsers/story/models/nodes";
import { SymbolType } from "../models/symbol";

export default function getCallerSymbolType(caller: CallerNode): SymbolType {
  if (caller.type === NodeType.Rule) {
    const { ruleType } = caller;
    if (ruleType === "PROC") {
      return SymbolType.Call;
    } else if (ruleType === "QRY") {
      return SymbolType.Query;
    }
  }

  const { identifierType } = caller.signature.identifier;
  if (identifierType === IdentifierType.Database) {
    return SymbolType.Database;
  }

  return SymbolType.Unknown;
}
