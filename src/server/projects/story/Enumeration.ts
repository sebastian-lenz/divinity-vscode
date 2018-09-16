import { CompletionItem, CompletionItemKind } from "vscode-languageserver";

import Goal from "./Goal";
import { EnumerationMap } from "./Enumerations";
import { ParameterType } from "./models/parameter";

import {
  StringLiteralNode,
  NumericLiteralNode
} from "../../parsers/story/models/nodes";

function sortMember(a: EnumerationMember, b: EnumerationMember): number {
  const aValue = `${a.value}`;
  const bValue = `${b.value}`;
  return aValue.localeCompare(bValue);
}

export interface ParameterReference {
  name: string;
  index: number;
}

export interface EnumerationMember {
  goals?: Array<Goal>;
  isPredefined?: boolean;
  label?: string;
  value: string | number;
}

export default class Enumeration {
  readonly description?: string;
  readonly fixed?: boolean;
  readonly name: string;
  readonly parameters: Array<ParameterReference>;
  readonly type: ParameterType.Integer | ParameterType.String;
  readonly values: Array<EnumerationMember>;

  constructor(data: any) {
    this.description = data.description;
    this.fixed = data.fixed;
    this.name = data.name;
    this.type =
      data.type === "string" ? ParameterType.String : ParameterType.Integer;

    this.parameters = data.parameters
      ? data.parameters.map((value: ParameterReference) => ({
          index: value.index,
          name: value.name.toLowerCase()
        }))
      : [];

    this.values = data.values
      ? data.values.map((value: EnumerationMember) => ({
          ...value,
          isPredefined: true
        }))
      : [];
  }

  addValue(goal: Goal, argument: StringLiteralNode | NumericLiteralNode) {
    const { values } = this;
    const { value } = argument;
    if (this.fixed) {
      return;
    }

    if (typeof value === "string" && value === "") {
      return;
    }

    let item = values.find(item => item.value === value);
    if (!item) {
      values.push({
        goals: [goal],
        value
      });
    } else {
      const goals = item.goals ? item.goals : (item.goals = []);
      const goalIndex = goals.indexOf(goal);
      if (goalIndex === -1) {
        goals.push(goal);
      }
    }
  }

  collectCompletions(result: Array<CompletionItem>) {
    for (const value of this.values) {
      result.push({
        detail: value.label,
        kind: CompletionItemKind.EnumMember,
        label: `${value.value}`
      });
    }
  }

  findSymbolEnums(name: string, result: EnumerationMap) {
    for (const parameter of this.parameters) {
      if (parameter.name !== name) {
        continue;
      }

      result[parameter.index] = this;
    }
  }

  getSortedValues(): Array<EnumerationMember> {
    return this.values.sort(sortMember);
  }

  removeByGoal(goal: Goal) {
    const { values } = this;
    let index = 0;

    while (index < values.length) {
      const value = values[index];
      if (!value.goals) {
        index += 1;
        continue;
      }

      const goalIndex = value.goals.indexOf(goal);
      if (goalIndex === -1) {
        index += 1;
        continue;
      }

      value.goals.splice(goalIndex, 1);
      if (value.goals.length === 0 && !value.isPredefined) {
        values.splice(index, 1);
      } else {
        index += 1;
      }
    }
  }
}
