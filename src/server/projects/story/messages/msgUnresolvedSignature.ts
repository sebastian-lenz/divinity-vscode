import Symbol from "../Symbol";
import toParameters from "../utils/toParameters";
import { ParameterType } from "../models/parameter";
import { RuleNode } from "../../../parsers/story/models/nodes";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

function printDefinitionError(rule: RuleNode, symbol: Symbol): string {
  const { parameters } = toParameters(symbol, rule.signature);

  const unknowns: Array<string> = [];
  for (let index = 0; index < parameters.length; index++) {
    const parameter = parameters[index];
    if (
      parameter.type === ParameterType.Unknown ||
      parameter.type === ParameterType.Invalid
    ) {
      unknowns.push(`#${index + 1} "${parameter.name}"`);
    }
  }

  if (unknowns.length) {
    let parameters: string;

    if (unknowns.length === 1) {
      parameters = `parameter ${unknowns[0]}`;
    } else {
      const andUnknown = unknowns.length > 1 ? unknowns.pop() : undefined;
      parameters = `parameters ${unknowns.join(", ")}${
        andUnknown ? ` and ${andUnknown}` : ""
      }`;
    }

    return `: the type of ${parameters} could not be resolved`;
  }

  return `.`;
}

export type Params = {
  rule: RuleNode;
  symbol: Symbol;
};

export default function msgUnresolvedSignature({
  rule,
  symbol
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.UnresolvedSignature,
    message: `Signature of "${
      symbol.name
    }" could not be determined${printDefinitionError(rule, symbol)}`,
    severity: DiagnosticSeverity.Error
  };
}
