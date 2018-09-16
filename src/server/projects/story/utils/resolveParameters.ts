import Symbol, { SymbolDefinition } from "../Symbol";
import { EnumerationMap } from "../Enumerations";
import { Parameter, ParameterType } from "../models/parameter";

export const enum ResolvePrameterResult {
  Dead,
  Partial,
  Unresolved
}

export default function resolveParameters(
  symbol: Symbol,
  definition: SymbolDefinition,
  unresolved?: Array<number>
): Array<Parameter> | ResolvePrameterResult {
  const { isPartial, parameters } = definition;
  const { parameterNames: names } = symbol;
  const resolved: Array<Parameter> = [];
  const enumMap = symbol.getEnumMap();

  if (isPartial) {
    return ResolvePrameterResult.Partial;
  }

  for (let index = 0; index < parameters.length; index++) {
    const { flow, fromIndex, fromSymbol, type } = parameters[index];
    const name = names[index].name;
    const enumeration = enumMap[index];

    if (type !== ParameterType.Unknown) {
      resolved.push({
        enumeration,
        flow,
        fromIndex: null,
        fromSymbol: null,
        name,
        type
      });

      continue;
    }

    if (fromSymbol && fromIndex !== null) {
      if (fromSymbol.isDead) {
        return ResolvePrameterResult.Dead;
      } else if (fromSymbol.needsUpdate) {
        // Check for loops - If the other symbol is only waiting for
        // definitions from us, it's a deadlock
        if (
          fromSymbol.definitions.every(otherDefinition =>
            otherDefinition.parameters.some(
              otherParameter => otherParameter.fromSymbol === symbol
            )
          )
        ) {
          return ResolvePrameterResult.Dead;
        }
      }

      const type = fromSymbol.parameters[fromIndex].type;
      if (type === ParameterType.Unknown) {
        if (unresolved) {
          unresolved.push(index);
        } else {
          return ResolvePrameterResult.Unresolved;
        }
      }

      resolved.push({ enumeration, flow, fromIndex, fromSymbol, name, type });
      continue;
    }

    if (unresolved) {
      unresolved.push(index);
    } else {
      return ResolvePrameterResult.Unresolved;
    }
  }

  return resolved;
}
