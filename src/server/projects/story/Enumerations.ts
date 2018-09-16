import { readFileSync } from "fs";
import { join } from "path";

import Enumeration from "./Enumeration";
import getPackagePath from "../../../shared/getPackagePath";
import Goal from "./Goal";

export interface EnumerationMap {
  [index: number]: Enumeration;
}

export default class Enumerations {
  readonly enums: Array<Enumeration>;

  constructor() {
    this.enums = this.loadDefinitions();
  }

  findSymbolEnums(name: string): EnumerationMap {
    const result: EnumerationMap = {};
    for (const enumeration of this.enums) {
      enumeration.findSymbolEnums(name, result);
    }

    return result;
  }

  loadDefinitions(): Array<Enumeration> {
    try {
      const path = join(
        getPackagePath(),
        "resources",
        "data",
        "enumerations.json"
      );

      return JSON.parse(readFileSync(path, "utf-8")).map(
        (data: any) => new Enumeration(data)
      );
    } catch (error) {
      return [];
    }
  }

  removeByGoal(goal: Goal) {
    for (const enumeration of this.enums) {
      enumeration.removeByGoal(goal);
    }
  }
}
