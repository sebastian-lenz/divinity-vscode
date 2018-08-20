import { ParameterType } from "../models/parameter";

export default function printParameterType(value?: ParameterType): string {
  switch (value) {
    case ParameterType.Integer:
      return "INTEGER";
    case ParameterType.Integer64:
      return "INTEGER64";
    case ParameterType.Real:
      return "REAL";
    case ParameterType.String:
      return "STRING";
    case ParameterType.Guid:
      return "GUIDSTRING";
    case ParameterType.CharacterGuid:
      return "CHARACTERGUID";
    case ParameterType.ItemGuid:
      return "ITEMGUID";
    case ParameterType.TriggerGuid:
      return "TRIGGERGUID";
    case ParameterType.SplineGuid:
      return "SPLINEGUID";
    case ParameterType.LevelTemplateGuid:
      return "LEVELTEMPLATEGUID";
    default:
      return "Unknown";
  }
}
