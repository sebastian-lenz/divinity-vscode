import { Connection } from "vscode-languageserver/lib/main";
import { TextDocumentChangeEvent } from "vscode-languageserver/lib/main";

import Feature from "../Feature";
import Resource from "../../projects/story/resources/Resource";
import Server from "../../Server";
import parseUri from "../../utils/parseUri";

export default class DiagnosticsFeature extends Feature {
  constructor(server: Server) {
    super(server);

    const { documents, projects } = server;
    documents.onDidClose(this.handleDocumentDidClose);
    documents.onDidChangeContent(this.handleDocumentChangeContent);
    documents.onDidOpen(this.handleDocumentOpen);
    projects.on("diagnostics", this.handleDiagnostics);
  }

  private async findFile(
    event: TextDocumentChangeEvent
  ): Promise<Resource | null> {
    const { projects } = this.server;
    return projects.findResource(event.document.uri);
  }

  private handleDocumentDidClose = async (event: TextDocumentChangeEvent) => {
    // this.documentSettings.delete(event.document.uri);
    const goal = await this.findFile(event);
    if (goal) {
      goal.setDocument(null);
    }
  };

  private handleDocumentChangeContent = async (
    event: TextDocumentChangeEvent
  ) => {
    const file = await this.findFile(event);
    if (file) {
      file.invalidate();
    }
  };

  private handleDocumentOpen = async (event: TextDocumentChangeEvent) => {
    const file = await this.findFile(event);
    if (file) {
      file.setDocument(event.document);
      this.handleDiagnostics(file);
    } else {
      this.server.connection.window.showErrorMessage(
        "This document seems not be part of a Divinity modification."
      );
    }
  };

  private handleDiagnostics = (file: Resource) => {
    const { connection } = this.server;

    connection.sendDiagnostics({
      uri: file.getUri(),
      diagnostics: file.getDiagnostics().map(d => ({
        severity: d.severity,
        range: {
          start: d.range.start,
          end: d.range.end
        },
        message: d.message
      }))
    });
  };

  initialize(connection: Connection): void {
    connection.workspace.getWorkspaceFolders().then(folders => {
      if (!folders) {
        return;
      }

      const { projects } = this.server;
      for (const folder of folders) {
        const parsedUri = parseUri(folder.uri);
        if (!parsedUri || parsedUri.type !== "path") {
          continue;
        }

        projects.tryCreateForFolder(parsedUri.path);
      }
    });
  }
}
