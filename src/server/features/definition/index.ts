import {
  Location,
  ServerCapabilities,
  TextDocumentPositionParams
} from "vscode-languageserver";

import Feature from "../Feature";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import Symbol from "../../projects/story/Symbol";
import unpackRange from "../../parsers/story/utils/unpackRange";
import { apiShowEvent } from "../../../shared/notifications";

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

    let systemSymbol: Symbol | undefined;
    if (symbol.isSystem) {
      systemSymbol = symbol;
    } else if (resource) {
      const symbols = resource.story.symbols.findSymbols(symbol.name);
      systemSymbol = symbols.find(symbol => symbol.isSystem);
    }

    if (systemSymbol) {
      // VS Code also calls this when pressing Ctrl and hovering symbols in
      // the document, reduce unwanted API explorer popups by only showing
      // it if the signature name is focused
      const document = resource.getDocument();
      if (document) {
        const offset = document.offsetAt(params.position);
        if (
          offset < node.signature.identifier.startOffset ||
          offset > node.signature.identifier.endOffset
        ) {
          return null;
        }
      }

      this.server.connection.sendNotification(
        apiShowEvent,
        `/definition/${systemSymbol.name}`
      );

      return {
        uri: params.textDocument.uri,
        range: {
          end: params.position,
          start: params.position
        }
      };
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
