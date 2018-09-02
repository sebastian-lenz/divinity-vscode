import { EventEmitter } from "events";
import { join } from "path";

import { ExtensionContext, OutputChannel, window, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  TransportKind,
  ServerOptions
} from "vscode-languageclient";

import features, { Feature } from "./features";
import { readyEvent } from "../shared/notifications";
import { existsSync } from "fs";

export default class Client extends EventEmitter {
  clientId = "osiris-language-server";
  clientName = "Osiris language server";
  connection: LanguageClient | null;
  connectCallbacks: Array<Function> = [];
  context: ExtensionContext;
  features: Array<Feature> = [];
  isReady: boolean = false;
  languages: Array<string> = ["divinity-story-goal"];
  outputChannel: OutputChannel;

  constructor(context: ExtensionContext) {
    super();

    this.context = context;
    this.outputChannel = window.createOutputChannel(this.clientName);
    this.connection = this.createConnection();
    this.features = features.map(feature => new feature(this));
  }

  private createConnection() {
    const { context, languages, outputChannel } = this;
    const module = context.asAbsolutePath(join("lib", "server", "index.js"));

    let serverOptions: ServerOptions = {
      run: {
        module,
        transport: TransportKind.ipc
      },
      debug: {
        module,
        transport: TransportKind.ipc,
        options: { execArgv: ["--nolazy", "--inspect=6009"] }
      }
    };

    let clientOptions: LanguageClientOptions = {
      documentSelector: [
        ...languages.map(language => ({
          scheme: "file",
          language
        })),
        {
          scheme: "divinity"
        }
      ],
      outputChannel
    };

    const client = new LanguageClient(
      this.clientId,
      this.clientName,
      serverOptions,
      clientOptions
    );

    client.start();
    client.onReady().then(() => {
      client.onNotification(readyEvent, () => {
        if (this.isReady) return;
        this.isReady = true;

        for (const feature of this.features) {
          feature.initialize(client);
        }

        for (const callback of this.connectCallbacks) {
          callback(client);
        }
      });
    });

    return client;
  }

  dispose(): Thenable<void> {
    const { connection, features } = this;
    const promises: Thenable<void>[] = features.map(feature =>
      feature.dispose()
    );

    if (connection) {
      promises.push(connection.stop());
    }

    this.connection = null;
    this.features.length = 0;
    return Promise.all(promises).then(() => undefined);
  }

  async getConnection(): Promise<LanguageClient> {
    if (this.connection && this.isReady) {
      return this.connection;
    } else {
      return new Promise<LanguageClient>(resolve => {
        this.connectCallbacks.push(resolve);
      });
    }
  }

  getExecutable(fileName: string) {
    // const path = join(getPackagePath(), "bin", fileName);
    const compilerPath = workspace
      .getConfiguration("divinity")
      .get<string>("compilerPath");

    if (!compilerPath) return undefined;
    const path = join(compilerPath, fileName);

    return existsSync(path) ? path : undefined;
  }
}
