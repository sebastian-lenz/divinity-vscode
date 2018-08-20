import { Hover } from "vscode-languageserver";

import printParameterType from "../../projects/story/utils/printParameterType";
import unpackRange from "../../parsers/story/utils/unpackRange";
import { IdentifierType, NodeType } from "../../parsers/story/models/nodes";
import { SyncProvider, ProviderContext } from "./Provider";

export default class VariableProvider extends SyncProvider {
  invoke({ node, nodes }: ProviderContext): Hover | null {
    if (
      node.type !== NodeType.Identifier ||
      node.identifierType !== IdentifierType.Variable
    ) {
      return null;
    }

    const variablesAt = this.feature.getVariablesAt(nodes);
    if (!variablesAt) return null;

    const { rule, variables } = variablesAt;
    const variable = variables.find(
      variable => variable.name === node.name.toLowerCase()
    );

    if (!variable) {
      return null;
    }

    let origin: string;
    if (variable.fromSymbol === rule.symbol && rule.ruleType !== "IF") {
      origin = `From parameter #${variable.fromIndex + 1} of definition`;
    } else {
      origin = `From parameter #${variable.fromIndex + 1} of \`${
        variable.fromSymbol.name
      }\``;
    }

    return {
      contents: [
        "**Local variable**  ",
        origin,
        "```divinity-story-goal",
        `(${printParameterType(variable.type)})${node.name}`,
        "```"
      ].join("\n"),
      range: unpackRange(node)
    };
  }
}
