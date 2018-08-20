import { Connection } from "vscode-languageserver/lib/main";

import Feature from "../Feature";
import {
  divRequestEvent,
  divRequestResultEvent,
  DivRequestResult
} from "../../../shared/notifications";

export default class DivProviderFeature extends Feature {
  initialize(connection: Connection): void {
    connection.onNotification(divRequestEvent, this.handleDivRequest);
  }

  handleDivRequest = async (uri: string) => {
    const { connection, projects } = this.server;
    if (!connection) {
      return;
    }

    let content: string | null = null;
    const resource = await projects.findResource(uri);
    if (resource) {
      content = await resource.getSource();
    }

    const result: DivRequestResult = {
      content,
      uri
    };

    connection.sendNotification(divRequestResultEvent, result);
  };
}
