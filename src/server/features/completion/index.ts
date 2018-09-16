import {
  ServerCapabilities,
  CompletionParams,
  CompletionItem,
  CompletionItemKind
} from "vscode-languageserver";

import printSymbol from "../../projects/story/utils/printSymbol";
import printSymbolType from "../../projects/story/utils/printSymbolType";
import Project from "../../projects/Project";
import Resource from "../../projects/story/resources/Resource";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import Symbol from "../../projects/story/Symbol";
import ucfirst from "../../utils/ucfirst";
import unpackPosition from "../../parsers/story/utils/unpackPosition";
import { Feature } from "..";
import { NodeType, AnyNode } from "../../parsers/story/models/nodes";
import { SymbolType } from "../../projects/story/models/symbol";
import printParameterType from "../../projects/story/utils/printParameterType";
import isCallerNode from "../../parsers/story/utils/isCallerNode";

const SYMBOL_DATA = "divinity.symbol:";

const KEYWORDS: Array<CompletionItem> = [
  // Better handeled by snippets
  // "IF",
  // "PROC",
  // "QRY",
  // "AND",

  "THEN",
  "NOT",
  "INITSECTION",
  "KBSECTION",
  "EXITSECTION",
  "ENDEXITSECTION",
  "GoalCompleted"
].map(keyword => ({
  label: keyword,
  kind: 14 as any // CompletionItemKind.Keyword
}));

export enum CompletionType {
  Condition,
  Events,
  Global,
  Parameter,
  Procedures,
  Queries,
  Rule,
  Type
}

function fromRuleType(ruleType: string, type: CompletionType): CompletionType {
  if (ruleType === "IF") {
    return CompletionType.Events;
  } else if (ruleType === "PROC") {
    return CompletionType.Procedures;
  } else if (ruleType === "QRY") {
    return CompletionType.Queries;
  }

  return type;
}

export interface ParameterInfo {
  index: number;
  name: string;
}

export default class CompletionFeature extends Feature {
  constructor(server: Server) {
    super(server);

    const { connection } = server;
    connection.onCompletion((params, token) =>
      runSafeAsync(
        () => this.handleCompletion(params),
        null,
        `Error while computing completions for ${params.textDocument.uri}`,
        token
      )
    );

    connection.onCompletionResolve((params, token) =>
      this.handleResolveCompletion(params)
    );
  }

  getCapabilities(): Partial<ServerCapabilities> {
    return {
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['"']
      }
    };
  }

  getConditionCompletions(resource: Resource): Array<CompletionItem> {
    const { symbols } = resource.story.symbols;
    return this.getSymbolCompletions(
      resource.story.project,
      symbols.filter(
        symbol =>
          symbol.type === SymbolType.Database ||
          symbol.type === SymbolType.Query
      )
    );
  }

  getEventCompletions(resource: Resource): Array<CompletionItem> {
    const { symbols } = resource.story.symbols;
    return this.getSymbolCompletions(
      resource.story.project,
      symbols.filter(
        symbol =>
          symbol.type === SymbolType.Database ||
          symbol.type === SymbolType.Event
      )
    );
  }

  getGlobalCompletions(resource: Resource): Array<CompletionItem> {
    const { symbols } = resource.story.symbols;
    return this.getSymbolCompletions(
      resource.story.project,
      symbols.filter(
        symbol =>
          symbol.type === SymbolType.Call || symbol.type === SymbolType.Database
      )
    );
  }

  getParameterCompletions(
    resource: Resource,
    nodes?: Array<AnyNode>,
    parameter?: ParameterInfo
  ): Array<CompletionItem> {
    const result = this.getSpecificParameterCompletions(resource, parameter);

    const variablesAt = this.getVariablesAt(nodes);
    if (variablesAt) {
      for (const variable of variablesAt.variablesBefore) {
        result.push({
          detail: printParameterType(variable.type),
          kind: CompletionItemKind.Variable,
          label: variable.displayName
        });
      }
    }

    return result;
  }

  getSpecificParameterCompletions(
    resource: Resource,
    parameter?: ParameterInfo
  ): Array<CompletionItem> {
    const result: Array<CompletionItem> = [];
    if (!parameter) return result;

    const { index, name } = parameter;
    const { symbols } = resource.story;
    const symbol = symbols.findSymbolWithMostParameters(name);
    if (!symbol) return result;

    const info = symbol.parameters[index];
    if (!info) return result;

    if (info.enumeration) {
      info.enumeration.collectCompletions(result);
    }

    const { levels } = resource.story.project;
    levels.collectCompletions(result, info.type);

    return result;
  }

  getProceduresCompletions(resource: Resource): Array<CompletionItem> {
    const { symbols } = resource.story.symbols;
    return this.getSymbolCompletions(
      resource.story.project,
      symbols.filter(symbol => symbol.type === SymbolType.Call)
    );
  }

  getQueriesCompletions(resource: Resource): Array<CompletionItem> {
    const { symbols } = resource.story.symbols;
    return this.getSymbolCompletions(
      resource.story.project,
      symbols.filter(symbol => symbol.type === SymbolType.Query)
    );
  }

  getSymbolCompletions(
    project: Project,
    symbols: Array<Symbol>
  ): Array<CompletionItem> {
    const names: { [name: string]: boolean } = {};
    const result: Array<CompletionItem> = [];

    for (const symbol of symbols) {
      if (symbol.name in names) continue;
      names[symbol.name] = true;

      let kind: CompletionItemKind = CompletionItemKind.Struct;
      switch (symbol.type) {
        case SymbolType.Call:
          kind = CompletionItemKind.Function;
          break;
        case SymbolType.Database:
          kind = CompletionItemKind.Enum;
          break;
        case SymbolType.Event:
          kind = CompletionItemKind.Event;
          break;
        case SymbolType.Query:
          kind = CompletionItemKind.Interface;
          break;
        default:
          continue;
      }

      result.push({
        data: `${SYMBOL_DATA}${project.meta.uuid}`,
        kind,
        label: symbol.name
      });
    }

    return result.concat(KEYWORDS);
  }

  getTypeCompletions(resource: Resource): Array<CompletionItem> {
    const { types } = resource.story;
    return types.map(type => ({
      kind: CompletionItemKind.TypeParameter,
      label: type
    }));
  }

  async handleCompletion(
    params: CompletionParams
  ): Promise<Array<CompletionItem> | null> {
    const { nodes, resource } = await this.getNodesAt(params);
    if (!resource) {
      return null;
    }

    const document = resource.getDocument();
    let type: CompletionType = CompletionType.Global;
    let parameter: ParameterInfo | undefined;

    if (document && nodes) {
      const offset = document.offsetAt(params.position);
      for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        if (node.type === NodeType.TypeAnnotation) {
          type = CompletionType.Type;
          break;
        }

        if (
          node.type === NodeType.Signature &&
          node.identifier.endOffset < offset
        ) {
          const chunk = document.getText({
            start: unpackPosition(node.identifier.endPosition),
            end: params.position
          });

          parameter = {
            index: chunk.replace(/"[^"]*"/g, "_").split(",").length - 1,
            name: node.identifier.name
          };

          type = /\([^\)]*$/.test(chunk.substr(1))
            ? CompletionType.Type
            : CompletionType.Parameter;
          break;
        }

        if (node.type === NodeType.ActionBlock) {
          type = CompletionType.Global;
          break;
        }

        if (node.type === NodeType.ConditionBlock) {
          type = CompletionType.Condition;
          break;
        }

        if (node.type === NodeType.Rule) {
          if (offset > node.signature.endOffset) {
            type = CompletionType.Condition;
          } else {
            type = fromRuleType(node.ruleType, type);
          }
          break;
        }
      }
    }

    if (document && type === CompletionType.Global) {
      const chunk = document.getText({
        start: document.positionAt(
          Math.max(0, document.offsetAt(params.position) - 64)
        ),
        end: params.position
      });

      const match = /(AND|IF|PROC|QRY)[\n\r\s]+[A-Za-z0-9_-]*$/.exec(chunk);
      if (match) {
        if (match[1] === "AND") {
          type = CompletionType.Condition;
        } else {
          type = fromRuleType(match[1], type);
        }
      }
    }

    switch (type) {
      case CompletionType.Condition:
        return this.getConditionCompletions(resource);
      case CompletionType.Events:
        return this.getEventCompletions(resource);
      case CompletionType.Parameter:
        return this.getParameterCompletions(resource, nodes, parameter);
      case CompletionType.Procedures:
        return this.getProceduresCompletions(resource);
      case CompletionType.Queries:
        return this.getQueriesCompletions(resource);
      case CompletionType.Type:
        return this.getTypeCompletions(resource);
      default:
        return this.getGlobalCompletions(resource);
    }
  }

  async handleResolveCompletion(item: CompletionItem): Promise<CompletionItem> {
    const { data } = item;
    if (typeof data === "string" && data.startsWith(SYMBOL_DATA)) {
      const uid = data.substr(SYMBOL_DATA.length);
      const project = this.server.projects.findProjectByUid(uid);
      if (!project) return item;

      const { symbols } = project.story;
      const chunks: Array<string> = [];
      const matchingSymbols = symbols.findSymbols(item.label);
      if (matchingSymbols.length === 0) return item;

      const symbol = matchingSymbols[0];
      item.detail = ucfirst(printSymbolType(symbol.type));
      chunks.push("```divinity-story-goal", printSymbol(symbol, true), "```");

      const documentation = await symbols.getDocumentation(symbol);
      if (documentation && documentation.description) {
        chunks.push(documentation.description);
      }

      item.documentation = {
        kind: "markdown",
        value: chunks.join("\n")
      };
    }

    return item;
  }
}
