import {
  ServerCapabilities,
  SymbolKind,
  SymbolInformation,
  TextDocument
} from "vscode-languageserver/lib/main";

import Feature from "../Feature";
import GoalResource from "../../projects/story/resources/GoalResource";
import HeaderGoalResource from "../../projects/story/resources/HeaderGoalResource";
import printNode from "../../parsers/story/utils/printNode";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import toLocation from "../../utils/toLocation";
import { AbstractGoalNode } from "../../parsers/story/models/nodes";

export default class DocumentSymbolsFeature extends Feature {
  constructor(server: Server) {
    super(server);

    server.connection.onDocumentSymbol((params, token) =>
      runSafeAsync(
        () => this.getSymbols(params.textDocument.uri),
        [],
        `Error while computing document symbols for ${params.textDocument.uri}`,
        token
      )
    );
  }

  createGoalSymbolInfos(document: TextDocument, story: AbstractGoalNode) {
    const result: Array<SymbolInformation> = [];
    if (story.init) {
      result.push({
        containerName: "",
        name: "Init section",
        kind: 3, // SymbolKind.Namespace,
        location: toLocation(document, story.init)
      });
    }

    if (story.kb) {
      result.push({
        containerName: "",
        name: "KB section",
        kind: 3, // SymbolKind.Namespace,
        location: toLocation(document, story.kb)
      });

      for (const rule of story.kb.rules) {
        let kind: SymbolKind = 12; // SymbolKind.Function;
        if (rule.ruleType == "IF") {
          kind = 24; // SymbolKind.Event;
        } else if (rule.ruleType === "QRY") {
          kind = 11; // SymbolKind.Interface;
        }

        result.push({
          containerName: "KB section",
          name: printNode(rule),
          kind,
          location: toLocation(document, rule)
        });
      }

      if (story.exit) {
        result.push({
          containerName: "",
          name: "Exit section",
          kind: 3, // SymbolKind.Namespace,
          location: toLocation(document, story.exit)
        });
      }
    }

    return result;
  }

  getCapabilities(): Partial<ServerCapabilities> {
    return {
      documentSymbolProvider: true
    };
  }

  async getSymbols(uri: string) {
    const { projects } = this.server;
    const goal = await projects.findResource(uri);
    if (
      !(goal instanceof GoalResource) &&
      !(goal instanceof HeaderGoalResource)
    ) {
      return null;
    }

    await goal.story.whenReady();

    const document = goal.getDocument();
    const node = await goal.getRootNode();
    return document && node ? this.createGoalSymbolInfos(document, node) : null;
  }
}
