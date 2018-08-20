import Symbol from "../Symbol";
import { ParameterFlow } from "../../../parsers/story/models/nodes";

export enum ParameterType {
  Unknown,
  Invalid,
  Integer,
  Integer64,
  Real,
  String,
  Guid,
  CharacterGuid,
  ItemGuid,
  TriggerGuid,
  SplineGuid,
  LevelTemplateGuid
}

export interface Parameter {
  flow?: ParameterFlow;
  fromIndex?: number;
  fromSymbol?: Symbol;
  name: string;
  type: ParameterType;
}

export interface ScoredParameterName {
  name: string;
  score: number;
}
