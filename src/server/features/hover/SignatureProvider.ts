import { Hover } from "vscode-languageserver";

import printSymbol from "../../projects/story/utils/printSymbol";
import Resource from "../../projects/story/resources/Resource";
import Symbol from "../../projects/story/Symbol";
import unpackRange from "../../parsers/story/utils/unpackRange";
import { AsyncProvider, ProviderContext } from "./Provider";
import { NodeType, AnyNode } from "../../parsers/story/models/nodes";
import { SymbolType } from "../../projects/story/models/symbol";
import isCallerNode, {
  CallerNode
} from "../../parsers/story/utils/isCallerNode";

export interface Params {
  callerNode: CallerNode;
  node: AnyNode;
  resource: Resource;
  symbol: Symbol;
}

export default class SignatureProvider extends AsyncProvider<Params> {
  canHandle({ index, node, nodes, resource }: ProviderContext): Params | null {
    const callerNode = nodes[index + 2];
    if (!isCallerNode(callerNode) || node.type !== NodeType.Identifier) {
      return null;
    }

    const { symbol } = callerNode;
    if (!symbol) return null;

    return { callerNode, node, resource, symbol };
  }

  getUsageDescription(node: CallerNode, symbolType: SymbolType): string {
    switch (node.type) {
      case NodeType.SignatureAction:
        return symbolType === SymbolType.Database
          ? "Database write"
          : "Procedure call";
      case NodeType.SignatureCondition:
        return symbolType === SymbolType.Database
          ? "Database query"
          : "Query condition";
      case NodeType.Rule:
        switch (node.ruleType) {
          case "IF":
            return symbolType === SymbolType.Database
              ? "Database event handler"
              : "Event handler";
          case "PROC":
            return "Procedure definition";
          case "QRY":
            return "Query definition";
        }
    }

    return "Unknown invocation";
  }

  async invoke({
    callerNode,
    node,
    resource,
    symbol
  }: Params): Promise<Hover | null> {
    const documentation = await resource.story.symbols.getDocumentation(symbol);
    let description = "";
    if (documentation && documentation.description) {
      description = documentation.description;
    }

    return {
      contents: [
        `**${this.getUsageDescription(callerNode, symbol.type)}**  `,
        description,
        "```divinity-story-goal",
        `${printSymbol(symbol, true)}`,
        "```"
      ].join("\n"),
      range: unpackRange(node)
    };
  }
}
