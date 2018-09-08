import {
  CancellationToken,
  commands,
  debug,
  DebugConfiguration,
  DebugConfigurationProvider,
  ProviderResult,
  QuickPickItem,
  window,
  WorkspaceFolder
} from "vscode";

import Client from "../../Client";
import Feature from "../Feature";
import { join } from "path";
import { ProjectInfo } from "../../../shared/notifications";
import { LSLibFile } from "../../utils/LSLib";

export interface DvinityDebugConfiguration extends DebugConfiguration {
  backendHost?: string;
  backendPort?: number;
  debugInfoPath?: string;
  dbgOptions?: {
    rawFrames: boolean;
    stopOnAllFrames: boolean;
    stopOnDbPropagation: boolean;
  };
  type: "osiris";
}

export interface QuickPickProject extends QuickPickItem {
  project: ProjectInfo;
}

export default class DebugProviderFeature extends Feature
  implements DebugConfigurationProvider {
  constructor(client: Client) {
    super(client);

    commands.registerCommand(
      "divinity.getDebugExecutable",
      this.handleGetDebugExecutable,
      this
    );

    debug.registerDebugConfigurationProvider("osiris", this);
  }

  async getDebugInfoPath(): Promise<{
    debugInfoPath: string;
    modUuid: string;
  } | null> {
    const projects = this.client.getProjects();
    let project: ProjectInfo | undefined;

    if (projects.length > 1) {
      const items: Array<QuickPickProject> = projects.map(project => ({
        label: project.meta.name,
        project
      }));

      const pick = await window.showQuickPick(items);
      project = pick ? pick.project : undefined;
    } else {
      project = projects[0];
    }

    return project
      ? {
          debugInfoPath: join(project.path, "Story", "story.debugInfo"),
          modUuid: project.meta.uuid
        }
      : null;
  }

  /**
   * TODO: Implement this once it is available
   * 
   * This optional method is called just before a debug adapter is started to determine its excutable path and arguments.
   * Registering more than one debugAdapterExecutable for a type results in an error.
   * @param folder The workspace folder from which the configuration originates from or undefined for a folderless setup.
   * @param token A cancellation token.
   * @return a [debug adapter's executable and optional arguments](#DebugAdapterExecutable) or undefined.
  debugAdapterExecutable(
    folder: WorkspaceFolder | undefined,
    token?: CancellationToken
  ): ProviderResult<DebugAdapterExecutable> {}
   */

  handleGetDebugExecutable() {
    const command = this.client.lslib.resolve(LSLibFile.Debugger);
    if (!command) {
      this.client.lslib.offerInstall();
      throw new Error("Debugger is missing.");
    }

    return { command };
  }

  provideDebugConfigurations(
    folder: WorkspaceFolder | undefined,
    token?: CancellationToken
  ): ProviderResult<DvinityDebugConfiguration[]> {
    return [
      {
        type: "osiris",
        request: "launch",
        name: "Attach to Story Server"
      }
    ];
  }

  async resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    debugConfiguration: DvinityDebugConfiguration,
    token?: CancellationToken
  ): Promise<DebugConfiguration | null> {
    if (!("backendHost" in debugConfiguration)) {
      debugConfiguration.backendHost = "127.0.0.1";
    }

    if (!("backendPort" in debugConfiguration)) {
      debugConfiguration.backendPort = 9999;
    }

    if (
      !("debugInfoPath" in debugConfiguration) ||
      !("modUuid" in debugConfiguration)
    ) {
      const meta = await this.getDebugInfoPath();

      if (meta) {
        const { debugInfoPath, modUuid } = meta;

        if (!("debugInfoPath" in debugConfiguration)) {
          debugConfiguration.debugInfoPath = debugInfoPath;
        }

        if (!("modUuid" in debugConfiguration)) {
          debugConfiguration.modUuid = modUuid;
        }
      }
    }

    if (!("debugInfoPath" in debugConfiguration)) {
      return null;
    }

    return debugConfiguration;
  }
}
