import Enumeration from "../Enumeration";
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
  enumeration?: Enumeration;
  flow: ParameterFlow | null;
  fromIndex: number | null;
  fromSymbol: Symbol | null;
  name: string;
  type: ParameterType;
}

export interface ScoredParameterName {
  name: string;
  score: number;
}
