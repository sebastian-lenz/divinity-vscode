import { ParameterFlow } from "../../../parsers/story/models/nodes";

export default function printParameterFlow(value?: ParameterFlow): string {
  switch (value) {
    case ParameterFlow.In:
      return "IN";
    case ParameterFlow.Out:
      return "OUT";
    default:
      return "";
  }
}
