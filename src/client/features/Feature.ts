import { LanguageClient } from "vscode-languageclient";

import Client from "../Client";

export interface FeatureFactory {
  new (client: Client): Feature;
}

export default class Feature {
  readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  initialize(connection: LanguageClient) {}

  async dispose(): Promise<void> {
    return Promise.resolve();
  }
}
