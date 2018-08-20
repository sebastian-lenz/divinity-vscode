import { DefinitionNode } from "../../../parsers/story/models/nodes";
import { SymbolType } from "../models/symbol";

export default function getDefinitionSymbolType(
  definition: DefinitionNode
): SymbolType {
  switch (definition.definitionType.toLowerCase()) {
    case "event":
      return SymbolType.Event;
    case "sysquery":
    case "query":
    case "qry":
      return SymbolType.Query;
  }

  return SymbolType.Call;
}
