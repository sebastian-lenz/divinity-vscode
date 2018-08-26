import {
  ServerCapabilities,
  SymbolKind,
  SymbolInformation,
  TextDocument
} from "vscode-languageserver";

import Feature from "../Feature";
import GoalResource from "../../projects/story/resources/GoalResource";
import printNode from "../../parsers/story/utils/printNode";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import toLocation from "../../utils/toLocation";
import { AbstractGoalNode, Region } from "../../parsers/story/models/nodes";

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
        kind: SymbolKind.Namespace,
        location: toLocation(document, story.init)
      });
    }

    if (story.kb) {
      result.push({
        containerName: "",
        name: "KB section",
        kind: SymbolKind.Namespace,
        location: toLocation(document, story.kb)
      });

      let region: Region | null = null;
      for (const rule of story.kb.rules) {
        let kind: SymbolKind = SymbolKind.Function;
        if (rule.ruleType == "IF") {
          kind = SymbolKind.Event;
        } else if (rule.ruleType === "QRY") {
          kind = SymbolKind.Interface;
        }

        if (rule.region !== region) {
          region = rule.region;
          if (region) {
            result.push({
              containerName: "KB section",
              name: region.name,
              kind: SymbolKind.Namespace,
              location: toLocation(document, region)
            });
          }
        }

        result.push({
          containerName: region ? region.name : "KB section",
          name: printNode(rule),
          kind,
          location: toLocation(document, rule)
        });
      }

      if (story.exit) {
        result.push({
          containerName: "",
          name: "Exit section",
          kind: SymbolKind.Namespace,
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
    if (!(goal instanceof GoalResource)) {
      return null;
    }

    await goal.story.whenReady();

    const document = goal.getDocument();
    const node = await goal.getRootNode();
    return document && node ? this.createGoalSymbolInfos(document, node) : null;
  }
}
