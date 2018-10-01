import {
  ServerCapabilities,
  CompletionParams,
  CompletionItem,
  CompletionItemKind
} from "vscode-languageserver";

import printParameterType from "../../projects/story/utils/printParameterType";
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
import { isGuidType } from "../../projects/story/analyzers/Parameter";
import { NodeType, AnyNode } from "../../parsers/story/models/nodes";
import { SymbolType } from "../../projects/story/models/symbol";

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

  getComparisonCompletions(
    resource: Resource,
    leftOperant: string,
    nodes?: Array<AnyNode>,
    offset?: number
  ): Array<CompletionItem> {
    const variablesAt = this.getVariablesAt(nodes, offset);
    const result: Array<CompletionItem> = [];
    if (!variablesAt) {
      return result;
    }

    leftOperant = leftOperant.toLocaleLowerCase();
    const variable = variablesAt.variables.find(
      variable => variable.name === leftOperant
    );

    if (variable) {
      if (variable.enumeration) {
        variable.enumeration.collectCompletions(result);
      }

      if (variable.type && isGuidType(variable.type)) {
        const { levels } = resource.story.project;
        levels.collectCompletions(result, variable.type);
        result.push({
          label: "NULL_00000000-0000-0000-0000-000000000000"
        });
      }
    }

    for (const variable of variablesAt.variables) {
      result.push({
        detail: printParameterType(variable.type),
        kind: CompletionItemKind.Variable,
        label: variable.displayName
      });
    }

    return result;
  }

  getConditionCompletions(
    resource: Resource,
    nodes?: Array<AnyNode>,
    offset?: number
  ): Array<CompletionItem> {
    const { symbols } = resource.story.symbols;
    const result = this.getSymbolCompletions(
      resource.story.project,
      symbols.filter(
        symbol =>
          symbol.type === SymbolType.Database ||
          symbol.type === SymbolType.Query
      )
    );

    const variablesAt = this.getVariablesAt(nodes, offset);
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

    if (isGuidType(info.type)) {
      const { levels } = resource.story.project;
      levels.collectCompletions(result, info.type);
      result.push({
        label: "NULL_00000000-0000-0000-0000-000000000000"
      });
    }

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

    // Pure text based completions
    if (document) {
      const chunk = document.getText({
        start: document.positionAt(
          Math.max(0, document.offsetAt(params.position) - 1024)
        ),
        end: params.position
      });

      // No completions for line comments
      if (/\/\/[^\r\n]*$/.test(chunk)) {
        return [];
      }

      // No completions for block comments
      if (/\/\*((?!\*\/).)*$/.test(chunk)) {
        return [];
      }

      // Completion after an operator
      if (type === CompletionType.Global || type === CompletionType.Condition) {
        const match = /([^\s\n\r]+)\s*[=><]=?\s*[A-Za-z0-9_-]*$/.exec(chunk);
        if (match) {
          return this.getComparisonCompletions(
            resource,
            match[1],
            nodes,
            document ? document.offsetAt(params.position) : undefined
          );
        }
      }

      // Finally, check whether we can improve gloabl completion
      if (type === CompletionType.Global) {
        const match = /(AND|IF|PROC|QRY)[\n\r\s]+[A-Za-z0-9_-]*$/.exec(chunk);
        if (match) {
          if (match[1] === "AND") {
            type = CompletionType.Condition;
          } else {
            type = fromRuleType(match[1], type);
          }
        }
      }
    }

    switch (type) {
      case CompletionType.Condition:
        return this.getConditionCompletions(
          resource,
          nodes,
          document ? document.offsetAt(params.position) : undefined
        );
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
