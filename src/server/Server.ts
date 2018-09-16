import {
  createConnection,
  Connection,
  DidChangeConfigurationNotification,
  DidChangeConfigurationParams,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  ServerCapabilities,
  TextDocuments
} from "vscode-languageserver";

import Projects from "./projects";
import features, { Feature } from "./features";
import { readyEvent } from "../shared/notifications";

interface ExampleSettings {
  maxNumberOfProblems: number;
}

const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };

let globalSettings: ExampleSettings = defaultSettings;

export default class Server {
  connection: Connection;
  documents: TextDocuments;
  documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();
  features: Array<Feature> = [];
  hasConfigurationCapability: boolean = false;
  hasWorkspaceFolderCapability: boolean = false;
  hasDiagnosticRelatedInformationCapability: boolean = false;
  projects: Projects = new Projects();

  constructor() {
    // Create a connection for the server. The connection uses Node's IPC as a transport.
    // Also include all preview / proposed LSP features.
    const connection = createConnection(ProposedFeatures.all);
    connection.onInitialize(this.handleInitialize);
    connection.onInitialized(this.handleInitialized);
    connection.onDidChangeConfiguration(this.handleDidChangeConfiguration);

    connection.onExit(() => {
      this.projects.dispose();
      this.features.forEach(feature => feature.dispose());
    });

    // Create a simple text document manager. The text document manager
    // supports full document sync only
    const documents = new TextDocuments();

    documents.listen(connection);
    connection.listen();

    this.connection = connection;
    this.documents = documents;
  }

  getDocumentSettings(resource: string): Thenable<ExampleSettings> {
    const { connection, documentSettings, hasConfigurationCapability } = this;

    if (!hasConfigurationCapability) {
      return Promise.resolve(globalSettings);
    }

    let result = documentSettings.get(resource);
    if (!result) {
      result = connection.workspace.getConfiguration({
        scopeUri: resource,
        section: "osiris"
      });
      documentSettings.set(resource, result);
    }

    return result;
  }

  handleDidChangeConfiguration = (change: DidChangeConfigurationParams) => {
    const { documents, documentSettings, hasConfigurationCapability } = this;

    if (hasConfigurationCapability) {
      // Reset all cached document settings
      documentSettings.clear();
    } else {
      globalSettings = <ExampleSettings>(
        (change.settings.languageServerExample || defaultSettings)
      );
    }

    // Revalidate all open text documents
    // documents.all().forEach(document => this.project.analyze(document));
  };

  handleInitialize = (params: InitializeParams): InitializeResult => {
    const { capabilities } = params;
    const { textDocument, workspace } = capabilities;

    this.features = features.map(factory => new factory(this));

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    this.hasConfigurationCapability = !!(
      workspace && !!workspace.configuration
    );

    this.hasWorkspaceFolderCapability = !!(
      workspace && !!workspace.workspaceFolders
    );

    this.hasDiagnosticRelatedInformationCapability = !!(
      textDocument &&
      textDocument.publishDiagnostics &&
      textDocument.publishDiagnostics.relatedInformation
    );

    return {
      capabilities: this.features.reduce(
        (capabilities, feature) => ({
          ...capabilities,
          ...feature.getCapabilities()
        }),
        {
          textDocumentSync: this.documents.syncKind
        } as ServerCapabilities
      )
    };
  };

  handleInitialized = () => {
    const { connection, features, hasConfigurationCapability } = this;
    features.forEach(feature => feature.initialize(connection));

    connection.sendNotification(readyEvent);

    if (hasConfigurationCapability) {
      // Register for all configuration changes.
      connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined
      );
    }
  };
}
