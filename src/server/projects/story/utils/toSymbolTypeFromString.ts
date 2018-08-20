import { SymbolType } from "../models/symbol";

export default function toSymbolTypeFromString(
  value: string
): SymbolType | null {
  switch (value.toLowerCase()) {
    case "call":
    case "proc":
    case "syscall":
      return SymbolType.Call;
    case "event":
      return SymbolType.Event;
    case "sysquery":
    case "query":
    case "qry":
      return SymbolType.Query;
  }

  return null;
}
