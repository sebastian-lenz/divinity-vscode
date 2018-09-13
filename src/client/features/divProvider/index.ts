import { TextDocumentContentProvider, Uri, workspace } from "vscode";

import Client from "../../Client";
import Feature from "../Feature";
import {
  divContentRequest,
  DivContentResult,
  DivContentParams
} from "../../../shared/requests";

const scheme = "divinity";

export default class DivProviderFeature extends Feature
  implements TextDocumentContentProvider {
  constructor(client: Client) {
    super(client);

    client.context.subscriptions.push(
      workspace.registerTextDocumentContentProvider(scheme, this)
    );
  }

  async provideTextDocumentContent(uri: Uri): Promise<string | null> {
    const connection = await this.client.getConnection();
    const params: DivContentParams = {
      uri: uri.toString()
    };

    const result = await connection.sendRequest<DivContentResult | null>(
      divContentRequest,
      params
    );

    return result ? result.content : null;
  }
}
