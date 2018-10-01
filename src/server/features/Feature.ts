import {
  Connection,
  Position,
  ServerCapabilities,
  TextDocumentIdentifier
} from "vscode-languageserver";

import eachRuleNode from "../parsers/story/utils/eachRuleNode";
import isCallerNode, { CallerNode } from "../parsers/story/utils/isCallerNode";
import Resource from "../projects/story/resources/Resource";
import Server from "../Server";
import Symbol from "../projects/story/Symbol";
import { Variable } from "../projects/story/models/symbol";
import {
  AnyNode,
  NodeType,
  RuleNode,
  RuleBlockNode
} from "../parsers/story/models/nodes";

export interface LocationOptions {
  position: Position;
  textDocument: TextDocumentIdentifier;
}

export interface FeatureFactory {
  new (server: Server): Feature;
}

export interface VariablesAt {
  rule: RuleNode;
  variablesBefore: Array<Variable>;
  variables: Array<Variable>;
}

export default class Feature {
  readonly server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  dispose(): void {}

  getCapabilities(): Partial<ServerCapabilities> {
    return {};
  }

  async getNodesAt({
    position,
    textDocument
  }: LocationOptions): Promise<{
    nodes?: Array<AnyNode>;
    resource?: Resource;
  }> {
    const { projects } = this.server;
    const resource = await projects.findResource(textDocument.uri);
    if (!resource) return {};

    const nodes = await resource.getNodesAt(position);
    if (!nodes) return {};

    nodes.reverse();
    return { resource, nodes };
  }

  async getSymbolAt(
    options: LocationOptions
  ): Promise<{
    nodes?: Array<AnyNode>;
    node?: CallerNode;
    resource?: Resource;
    symbol?: Symbol;
  }> {
    const { nodes, resource } = await this.getNodesAt(options);
    if (!nodes || !resource) return { nodes, resource };

    for (const node of nodes) {
      if (isCallerNode(node) && node.symbol) {
        return { nodes, node, resource, symbol: node.symbol };
      }
    }

    return { nodes, resource };
  }

  getVariablesAt(
    nodes?: Array<AnyNode>,
    offset?: number
  ): VariablesAt | undefined {
    if (!nodes) {
      return undefined;
    }

    const ruleIndex = nodes.findIndex(node => node.type === NodeType.Rule);
    let rule: RuleNode | undefined;

    if (ruleIndex !== -1) {
      rule = nodes[ruleIndex] as RuleNode;
    } else {
      const ruleBlock = nodes.find(
        node => node.type === NodeType.RuleBlock
      ) as RuleBlockNode;

      if (ruleBlock && typeof offset === "number") {
        for (let index = 0; index < ruleBlock.rules.length; index++) {
          if (ruleBlock.rules[index].startOffset > offset) break;
          rule = ruleBlock.rules[index];
        }
      }
    }

    if (!rule) {
      return undefined;
    }

    let result: VariablesAt = { rule, variablesBefore: [], variables: [] };

    for (const { node, variablesBefore, variables } of eachRuleNode(rule)) {
      result = { rule, variablesBefore, variables };

      const index = nodes.indexOf(node);
      if (index !== -1 && index < ruleIndex) {
        break;
      }
    }

    return result;
  }

  initialize(connection: Connection): void {}
}
