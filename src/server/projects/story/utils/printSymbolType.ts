import Symbol from "../Symbol";
import { SymbolType } from "../models/symbol";

export default function printSymbolType(type: Symbol | SymbolType): string {
  let prefix = "";
  if (type instanceof Symbol) {
    if (type.isSystem) prefix = "system ";
    type = type.type;
  }

  switch (type) {
    case SymbolType.Call:
      return prefix + "call";
    case SymbolType.Database:
      return "database";
    case SymbolType.Event:
      return "event";
    case SymbolType.Query:
      return prefix + "query";
    default:
      return "<unknown>";
  }
}
