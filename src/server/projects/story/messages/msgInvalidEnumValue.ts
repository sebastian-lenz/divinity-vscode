import { get as levenshtein } from "fast-levenshtein";

import Enumeration from "../Enumeration";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  enumeration: Enumeration;
  value: number | string;
};

export default function msgInvalidEnumValue({
  enumeration,
  value
}: Params): DiagnosticMessage {
  let hint: string = "";
  if (typeof value === "string") {
    const similiar: Array<string> = [];
    const searchValue = value.toLowerCase();

    for (const item of enumeration.values) {
      const itemValue = `${item.value}`;
      if (levenshtein(itemValue.toLowerCase(), searchValue) < 4) {
        similiar.push(`"${itemValue}"`);
      }
    }

    if (similiar.length) {
      similiar.sort();
      const orSimiliar = similiar.length > 1 ? similiar.pop() : undefined;

      hint = ` Did you mean ${similiar.join(", ")}${
        orSimiliar ? ` or ${orSimiliar}` : ""
      }?`;
    }
  }

  return {
    code: DiagnosticCode.InvalidEnumValue,
    message: `The value "${value}" is not a valid member of the enumeration "${
      enumeration.name
    }".${hint}`,
    severity: DiagnosticSeverity.Error
  };
}
