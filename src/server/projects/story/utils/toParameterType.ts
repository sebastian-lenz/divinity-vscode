import { ParameterType } from "../models/parameter";

export default function toParameterType(value?: string): ParameterType {
  switch (value ? value.toUpperCase() : undefined) {
    case "INTEGER":
      return ParameterType.Integer;
    case "INTEGER64":
      return ParameterType.Integer64;
    case "REAL":
      return ParameterType.Real;
    case "STRING":
      return ParameterType.String;
    case "GUIDSTRING":
      return ParameterType.Guid;
    case "CHARACTERGUID":
      return ParameterType.CharacterGuid;
    case "ITEMGUID":
      return ParameterType.ItemGuid;
    case "TRIGGERGUID":
      return ParameterType.TriggerGuid;
    case "SPLINEGUID":
      return ParameterType.SplineGuid;
    case "LEVELTEMPLATEGUID":
      return ParameterType.LevelTemplateGuid;
    default:
      return ParameterType.Unknown;
  }
}
