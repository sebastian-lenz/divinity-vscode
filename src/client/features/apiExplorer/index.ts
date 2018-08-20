import { join } from "path";
import { LanguageClient, Disposable } from "vscode-languageclient";
import {
  commands,
  Uri,
  ViewColumn,
  WebviewPanel,
  WebviewPanelSerializer,
  window
} from "vscode";

import Client from "../../Client";
import Feature from "../Feature";
import { apiShowEvent } from "../../../shared/notifications";
import { apiRequest, ApiResult } from "../../../shared/requests";

const viewType: string = "divinity.apiExplorer";

export default class ApiExplorerFeature extends Feature
  implements WebviewPanelSerializer {
  location: string = "";
  panel: WebviewPanel | null = null;
  panelResources: Array<Disposable> = [];

  constructor(client: Client) {
    super(client);

    commands.registerCommand("divinity.showApiExplorer", this.handleShowApi);
    window.registerWebviewPanelSerializer(viewType, this);
  }

  initialize(connection: LanguageClient) {
    connection.onNotification(apiShowEvent, this.handleApiShow);
  }

  async deserializeWebviewPanel(panel: WebviewPanel, state: any) {
    let location: string;
    try {
      location = state.location;
    } catch (e) {
      location = "/";
    }

    this.setPanel(panel);
    this.navigate(typeof location === "string" ? location : "/");
  }

  getPanel(): WebviewPanel {
    let { panel } = this;
    if (panel) {
      if (!panel.visible) {
        panel.reveal();
      }

      return panel;
    }

    panel = window.createWebviewPanel(
      viewType,
      "API Explorer",
      ViewColumn.Beside,
      {
        enableFindWidget: true,
        enableScripts: true,
        localResourceRoots: this.getResourceConfig().localResourceRoots
      }
    );

    this.setPanel(panel);
    return panel;
  }

  getResourceConfig() {
    const { extensionPath } = this.client.context;
    const path = join(extensionPath, "resources");

    const scriptUri = Uri.file(join(path, "assets", "api.js"))
      .with({ scheme: "vscode-resource" })
      .toString();

    const styleUri = Uri.file(join(path, "assets", "api.css"))
      .with({ scheme: "vscode-resource" })
      .toString();

    return {
      localResourceRoots: [Uri.file(path)],
      uris: [
        {
          pattern: /%STYLE_URI%/g,
          value: styleUri
        },
        {
          pattern: /%SCRIPT_URI%/g,
          value: scriptUri
        }
      ]
    };
  }

  handleApiShow = (location: string) => {
    commands.executeCommand("divinity.showApiExplorer", location);
  };

  handleMessage = (message: any) => {
    if (typeof message !== "object") return;
    const { args, command } = message;

    switch (command) {
      case "goto":
        this.navigate(args[0]);
        break;
      case "reload":
        this.navigate(this.location, true);
        break;
    }
  };

  handlePanelDispose = () => {
    for (const resource of this.panelResources) {
      resource.dispose();
    }

    this.location = "";
    this.panelResources.length = 0;
    this.panel = null;
  };

  handleShowApi = (location: string = "/") => {
    this.getPanel();
    this.navigate(location);
  };

  async navigate(location: string, force?: boolean) {
    const { panel } = this;
    if (!panel) return;
    if (this.location === location && !force) return;
    this.location = location;

    const connection = await this.client.getConnection();
    const result = await connection.sendRequest<ApiResult | null>(
      apiRequest,
      location
    );

    if (!result) return;
    const { uris } = this.getResourceConfig();
    let { content } = result;

    for (const { pattern, value } of uris) {
      content = content.replace(pattern, value);
    }

    panel.webview.html = content;
  }

  setPanel(panel: WebviewPanel) {
    this.panelResources.push(panel.onDidDispose(this.handlePanelDispose));
    this.panelResources.push(
      panel.webview.onDidReceiveMessage(this.handleMessage)
    );
    this.panel = panel;
  }
}
