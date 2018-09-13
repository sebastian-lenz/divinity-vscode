import {
  Location,
  ServerCapabilities,
  TextDocumentPositionParams
} from "vscode-languageserver";

import Feature from "../Feature";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import unpackRange from "../../parsers/story/utils/unpackRange";

export default class DefinitionFeature extends Feature {
  constructor(server: Server) {
    super(server);

    server.connection.onDefinition((params, token) =>
      runSafeAsync(
        () => this.handleDefinition(params),
        null,
        `Error while computing definition for ${params.textDocument.uri}`,
        token
      )
    );
  }

  getCapabilities(): ServerCapabilities {
    return {
      definitionProvider: true
    };
  }

  async handleDefinition(
    params: TextDocumentPositionParams
  ): Promise<Location | null> {
    const { node, resource, symbol } = await this.getSymbolAt(params);
    if (!node || !resource || !symbol) {
      return null;
    }

    if (symbol.resolvedDefinition) {
      const definition = symbol.resolvedDefinition;
      return {
        uri: definition.goal.resource.getUri(),
        range: unpackRange(definition)
      };
    }

    return null;
  }
}
