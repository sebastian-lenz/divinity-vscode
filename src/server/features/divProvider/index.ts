import { Connection } from "vscode-languageserver";

import Feature from "../Feature";

import {
  divContentRequest,
  DivContentParams,
  DivContentResult
} from "../../../shared/requests";

export default class DivProviderFeature extends Feature {
  initialize(connection: Connection): void {
    connection.onRequest(divContentRequest, this.handleDivRequest);
  }

  handleDivRequest = async ({
    uri
  }: DivContentParams): Promise<DivContentResult | null> => {
    const { connection, projects } = this.server;
    if (!connection) {
      return null;
    }

    const resource = await projects.findResource(uri);
    if (!resource) {
      return null;
    }

    const result: DivContentResult = {
      content: await resource.getSource(),
      uri
    };

    return result;
  };
}
