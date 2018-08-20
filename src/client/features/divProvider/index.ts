import { EventEmitter } from "events";
import { LanguageClient } from "vscode-languageclient/lib/main";
import {
  ProviderResult,
  TextDocumentContentProvider,
  Uri,
  workspace,
  TextDocument
} from "vscode";

import Client from "../../Client";
import Feature from "../Feature";
import {
  divRequestEvent,
  divRequestResultEvent,
  DivRequestResult
} from "../../../shared/notifications";

const scheme = "divinity";

export default class DivProviderFeature extends Feature
  implements TextDocumentContentProvider {
  emitter: EventEmitter = new EventEmitter();

  constructor(client: Client) {
    super(client);

    client.context.subscriptions.push(
      workspace.registerTextDocumentContentProvider(scheme, this)
    );
  }

  initialize(connection: LanguageClient) {
    connection.onNotification(divRequestResultEvent, this.handleDivResult);
  }

  handleDivResult = (result: DivRequestResult) => {
    this.emitter.emit("result", result);
  };

  async provideTextDocumentContent(uri: Uri): Promise<string | null> {
    const { emitter } = this;
    const connection = await this.client.getConnection();
    const uriString = uri.toString();

    return new Promise<string | null>(resolve => {
      function callback(result: DivRequestResult) {
        if (result.uri === uriString) {
          emitter.removeListener("result", callback);
          resolve(result.content);
        }
      }

      emitter.addListener("result", callback);
      connection.sendNotification(divRequestEvent, uriString);
    });
  }
}
