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
import LSLib from "./utils/LSLib";
import TaskProviderFeature from "./features/taskProvider";
import {
  readyEvent,
  ProjectInfo,
  showErrorEvent
} from "../shared/notifications";

export default class Client extends EventEmitter {
  clientId = "osiris-language-server";
  clientName = "Osiris language server";
  connection: LanguageClient | null;
  connectCallbacks: Array<Function> = [];
  context: ExtensionContext;
  features: Array<Feature> = [];
  isReady: boolean = false;
  languages: Array<string> = ["divinity-story-goal"];
  lslib: LSLib = new LSLib(this);
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
      client.onNotification(showErrorEvent, message => {
        window.showErrorMessage(message);
      });

      client.onNotification(readyEvent, () => {
        if (this.isReady) return;
        this.isReady = true;
        this.lslib.update();

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

  getProjects(): Array<ProjectInfo> {
    const taskProvider = this.features.find(
      feature => feature instanceof TaskProviderFeature
    ) as TaskProviderFeature | undefined;

    if (!taskProvider || taskProvider.projects.length === 0) {
      return [];
    }

    return taskProvider.projects;
  }
}
