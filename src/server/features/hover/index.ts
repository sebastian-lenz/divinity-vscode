import {
  Hover,
  ServerCapabilities,
  TextDocumentPositionParams
} from "vscode-languageserver/lib/main";

import ConstantProvider from "./ConstantProvider";
import GuidProvider from "./GuidProvider";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import SignatureProvider from "./SignatureProvider";
import VariableProvider from "./VariableProvider";
import { AnyProvider, ProviderContext, SyncProvider } from "./Provider";
import { Feature } from "..";

export default class HoverFeature extends Feature {
  providers: Array<AnyProvider>;

  constructor(server: Server) {
    super(server);

    const { connection } = server;
    connection.onHover((params, token) =>
      runSafeAsync(
        () => this.handleHover(params),
        null,
        `Error while computing document hover for ${params.textDocument.uri}`,
        token
      )
    );

    this.providers = [
      new ConstantProvider(this),
      new GuidProvider(this),
      new SignatureProvider(this),
      new VariableProvider(this)
    ];
  }

  getCapabilities(): Partial<ServerCapabilities> {
    return {
      hoverProvider: true
    };
  }

  async handleHover(params: TextDocumentPositionParams): Promise<Hover | null> {
    const { nodes, resource } = await this.getNodesAt(params);
    if (!nodes || !resource) return null;

    const { providers } = this;
    let result: Hover | null = null;
    let localContext: {} | null;

    for (let index = 0; index < nodes.length; index++) {
      const context: ProviderContext = {
        index,
        node: nodes[index],
        nodes,
        resource
      };

      for (const provider of providers) {
        if (provider instanceof SyncProvider) {
          result = provider.invoke(context);
        } else if ((localContext = provider.canHandle(context))) {
          result = await provider.invoke(localContext);
        }

        if (result) return result;
      }
    }

    return null;
  }
}
