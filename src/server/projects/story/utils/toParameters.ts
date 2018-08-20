import getExplicitParameterType from "./getExplicitParameterType";
import Symbol from "../Symbol";
import { Parameter, ParameterType } from "../models/parameter";
import { Variable } from "../models/symbol";

import {
  SignatureNode,
  NodeType,
  IdentifierType
} from "../../../parsers/story/models/nodes";

export default function toParameters(
  symbol: Symbol,
  signature: SignatureNode,
  variables?: Array<Variable>
) {
  const positions = signature.parameters;
  const parameters: Array<Parameter> = [];
  let isInferred: boolean = false;
  let isPartial: boolean = false;

  for (let index = 0; index < positions.length; index++) {
    const position = positions[index];
    const { argument, flow } = position;

    let type = getExplicitParameterType(position);
    let name: string;
    if (argument.type === NodeType.Identifier) {
      name = argument.name;
    } else {
      name = `_Param${index + 1}`;
    }

    if (
      !type &&
      variables &&
      argument.type === NodeType.Identifier &&
      argument.identifierType === IdentifierType.Variable
    ) {
      const variable = variables.find(
        variable => variable.name === name.toLowerCase()
      );

      // Make sure we don't wait for variables from ourself
      if (variable && variable.fromSymbol !== symbol) {
        isInferred = true;
        parameters.push({
          flow,
          fromIndex: variable.fromIndex,
          fromSymbol: variable.fromSymbol,
          name,
          type: variable.type || ParameterType.Unknown
        });
        continue;
      }
    }

    if (!type) {
      isPartial = true;
      type = ParameterType.Invalid;
    }

    parameters.push({
      flow,
      name,
      type
    });
  }

  return {
    isInferred,
    isPartial,
    parameters
  };
}
