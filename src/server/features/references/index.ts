import {
  Location,
  ReferenceParams,
  ServerCapabilities
} from "vscode-languageserver";

import eachCaller from "../../parsers/story/utils/eachCaller";
import Feature from "../Feature";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import Symbol from "../../projects/story/Symbol";
import unpackRange from "../../parsers/story/utils/unpackRange";

export default class ReferencesFeature extends Feature {
  constructor(server: Server) {
    super(server);

    server.connection.onReferences((params, token) =>
      runSafeAsync(
        () => this.handleReferences(params),
        null,
        `Error while computing document hover for ${params.textDocument.uri}`,
        token
      )
    );
  }

  getCapabilities(): Partial<ServerCapabilities> {
    return {
      referencesProvider: true
    };
  }

  async getSymbolReferences(symbol: Symbol): Promise<Array<Location>> {
    const result: Array<Location> = [];

    for (const goal of symbol.usages) {
      const rootNode = await goal.resource.getRootNode(true);
      const uri = goal.resource.getUri();

      for (const { node } of eachCaller(rootNode)) {
        if (node.symbol === symbol) {
          result.push({
            uri,
            range: unpackRange(node)
          });
        }
      }
    }

    return result;
  }

  async handleReferences(
    params: ReferenceParams
  ): Promise<Array<Location> | null> {
    const { symbol } = await this.getSymbolAt(params);
    return symbol ? this.getSymbolReferences(symbol) : null;
  }
}
