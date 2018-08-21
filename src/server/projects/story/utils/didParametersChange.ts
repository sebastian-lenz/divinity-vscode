import { Parameter } from "../models/parameter";

export default function didParametersChange(
  from: Array<Parameter>,
  to: Array<Parameter>
): boolean {
  if (from.length !== to.length) return true;
  return !from.every((fromParameter, index) => {
    const toParameter = to[index];
    return (
      fromParameter.type === toParameter.type &&
      fromParameter.flow === toParameter.flow
    );
  });
}
