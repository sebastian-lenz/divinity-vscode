import Goal from "../Goal";
import Symbol from "../Symbol";
import { AnyNode } from "../../../parsers/story/models/nodes";
import { ParameterType } from "./parameter";
import Enumeration from "../Enumeration";

export interface SymbolParameterDoc {
  description?: string;
  name?: string;
}

export interface SymbolDoc<T extends SymbolParameterDoc = SymbolParameterDoc> {
  description?: string;
  parameters?: Array<T>;
}

export const enum SymbolType {
  Unknown,
  Call,
  Database,
  Event,
  Query
}

export interface SymbolLocation {
  goal: Goal;
  node: AnyNode;
}

export interface Variable {
  displayName: string;
  enumeration?: Enumeration;
  fromIndex: number;
  fromSymbol: Symbol;
  name: string;
  type?: ParameterType;
}
