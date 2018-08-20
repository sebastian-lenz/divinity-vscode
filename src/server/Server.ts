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

/*

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	let text = textDocument.getText();
	let pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray;

	let problems = 0;
	let diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		let diagnosic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnosic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnosic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnosic.range)
					},
					message: 'Particularly for names'
				}
			];
		}
		diagnostics.push(diagnosic);
	}

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);


connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/
