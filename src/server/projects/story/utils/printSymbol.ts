import printParameterType from "./printParameterType";
import Symbol from "../Symbol";
import { ParameterFlow } from "../../../parsers/story/models/nodes";

export default function printSymbol(
  symbol: Symbol,
  useLineBreaks?: boolean
): string {
  let parameters = symbol.parameters
    .map(({ flow, name, type }) => {
      const parts: Array<string> = [];
      if (useLineBreaks) parts.push("  ");
      if (flow) parts.push(`[${flow === ParameterFlow.In ? "in" : "out"}]`);
      if (type) parts.push(`(${printParameterType(type)})`);
      parts.push(name);

      return parts.join("");
    })
    .join(useLineBreaks ? ",\n" : ", ");

  if (useLineBreaks && parameters.length) {
    parameters = `\n${parameters}\n`;
  }

  return `${symbol.name}(${parameters})`;
}
