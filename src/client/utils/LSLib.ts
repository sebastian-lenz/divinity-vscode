import * as rimraf from "rimraf";
import { existsSync, writeFileSync } from "fs";
import { Extract } from "unzipper";
import { join, normalize, sep } from "path";
import { parse } from "url";

import {
  commands,
  ProgressLocation,
  window,
  workspace,
  QuickPickItem
} from "vscode";

import Client from "../Client";
import { copyFile, readDir, readFile } from "../../shared/fs";
import { get, request } from "https";
import { ProjectInfo } from "../../shared/notifications";

const etagFileName = "lslib.etag";
const downloadUrl =
  "https://s3.eu-central-1.amazonaws.com/nb-stor/dos/Dbg/Dbg-Latest.zip";

export enum LSLibFile {
  Compiler,
  Debugger,
  Rcon
}

export interface ETagData {
  etag: string;
}

export interface DebuggerInstallPick extends QuickPickItem {
  action: "manual" | "editor" | "game";
  project?: ProjectInfo;
}

export default class LSLib {
  private client: Client;

  constructor(client: Client) {
    this.client = client;

    commands.registerCommand(
      "divinity.installLSLib",
      this.handleInstallLSLib,
      this
    );

    commands.registerCommand(
      "divinity.installDebugger",
      this.handleInstallDebugger,
      this
    );

    commands.registerCommand(
      "divinity.updateLSLib",
      this.handleUpdateDebugger,
      this
    );
  }

  async clearInstallPath(path: string): Promise<boolean> {
    const etag = await this.tryReadETag(path);
    if (etag) {
      rimraf.sync(`${path}${sep}*`);
      return true;
    }

    return false;
  }

  async copyFiles(path: string, dirName: string) {
    const rootPath = this.getPath();
    if (!rootPath) {
      throw new Error("LSLib not installed.");
    }

    const sourcePath = join(rootPath, dirName);
    const sourceFiles = await readDir(sourcePath);
    for (const sourceFile of sourceFiles) {
      const source = join(sourcePath, sourceFile);
      const target = join(path, sourceFile);
      await copyFile(source, target);
    }
  }

  async download(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const stream = Extract({ path });

      window.withProgress(
        {
          cancellable: false,
          location: ProgressLocation.Notification,
          title: "Downloading LSLib Compiler and Debugger"
        },
        () =>
          new Promise((resolveProgress, rejectProgress) => {
            stream.on("finish", () => {
              resolve();
              resolveProgress();
            });

            stream.on("error", error => {
              reject(error);
              rejectProgress();
            });
          })
      );

      get(downloadUrl, response => {
        const { etag } = response.headers;
        if (etag && typeof etag === "string") {
          const data: ETagData = { etag };
          writeFileSync(join(path, etagFileName), JSON.stringify(data), {
            encoding: "utf-8"
          });
        }

        response.pipe(stream);
      });
    });
  }

  getDebuggerInstallPicks(): Array<DebuggerInstallPick> {
    const { client } = this;
    const projects = client.getProjects();
    const picks: Array<DebuggerInstallPick> = [];

    if (projects.length) {
      const editorPath = this.resolveEditorPath(projects[0]);
      if (editorPath) {
        picks.push({
          action: "editor",
          description: editorPath,
          label: "Install editor debugger",
          project: projects[0]
        });
      }

      const gamePath = this.resolveGamePath(projects[0]);
      if (gamePath) {
        picks.push({
          action: "game",
          description: gamePath,
          label: "Install game debugger",
          project: projects[0]
        });
      }
    }

    picks.push({
      action: "manual",
      label: "Manually install debugger"
    });

    return picks;
  }

  getPath(): string | undefined {
    return workspace.getConfiguration("divinity").get<string>("compilerPath");
  }

  async handleInstallLSLib() {
    const didInstall = await this.installLSLib();
    if (didInstall) {
      return this.installDebugger();
    }
  }

  async handleInstallDebugger() {
    return this.installDebugger();
  }

  async handleUpdateDebugger() {
    return this.update(true);
  }

  async installDebugger() {
    const picks = await window.showQuickPick(this.getDebuggerInstallPicks(), {
      canPickMany: true
    });

    if (!picks) {
      return;
    }

    for (const pick of picks) {
      switch (pick.action) {
        case "editor":
          const editorPath = this.resolveEditorPath(pick.project);
          if (editorPath) {
            await this.installDebuggerToPath(editorPath);
          }
          break;

        case "game":
          const gamePath = this.resolveGamePath(pick.project);
          if (gamePath) {
            await this.installDebuggerToPath(gamePath);
          }
          break;

        case "manual":
          await this.installDebuggerManual();
          break;
      }
    }
  }

  async installDebuggerManual(): Promise<boolean> {
    const pathUri = await window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Select editor or game"
    });

    if (!pathUri || pathUri.length === 0) {
      return false;
    }

    return this.installDebuggerToPath(pathUri[0].fsPath);
  }

  async installDebuggerToPath(path: string) {
    try {
      if (existsSync(join(path, "EoCApp.exe"))) {
        // Install to game directory
        await this.copyFiles(path, "GameBackend");
      } else if (existsSync(join(path, "DivinityEngine2.exe"))) {
        // Install to editor
        await this.copyFiles(path, "EditorBackend");
      } else {
        window.showErrorMessage(
          "Invalid path given, select the editor or game directory."
        );
        return false;
      }
    } catch (error) {
      window.showErrorMessage("Could not install debugger.");
      return false;
    }

    window.showInformationMessage(`Installed debugger to "${path}"`);
    return true;
  }

  async installLSLib(): Promise<boolean> {
    const pathUri = await window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Select install location"
    });

    if (!pathUri || pathUri.length === 0) {
      return false;
    }

    const path = pathUri[0].fsPath;
    if (!(await this.isValidInstallLocation(path))) {
      window.showErrorMessage(
        `Cannot install LSLib here, please select an empty folder.`
      );
      return false;
    }
    try {
      await this.download(path);
    } catch (error) {
      window.showErrorMessage("Could not download LSLib.");
      return false;
    }

    workspace.getConfiguration("divinity").update("compilerPath", path, true);
    window.showInformationMessage(
      "Successfully installed LSLib Compiler and Debugger."
    );

    return true;
  }

  async isValidInstallLocation(path: string): Promise<boolean> {
    if (await this.clearInstallPath(path)) {
      return true;
    }

    const files = await readDir(path);
    return files.length === 0;
  }

  async offerInstall() {
    const answer = await window.showErrorMessage(
      "LSLib Debuger not found. Do you want to install it?",
      "Yes",
      "No"
    );

    if (answer === "Yes") {
      this.handleInstallLSLib();
    }
  }

  resolve(type: LSLibFile): string | undefined {
    const localPath = this.getPath();
    if (!localPath) return undefined;

    let path: string;
    switch (type) {
      case LSLibFile.Compiler:
        path = join(localPath, "Compiler", "StoryCompiler.exe");
        break;
      case LSLibFile.Debugger:
        path = join(localPath, "Compiler", "DebuggerFrontend.exe");
        break;
      case LSLibFile.Rcon:
        path = join(localPath, "Compiler", "RconClient.exe");
        break;
      default:
        return undefined;
    }

    return existsSync(path) ? path : undefined;
  }

  resolveEditorPath(project?: ProjectInfo): string | undefined {
    if (!project) {
      return undefined;
    }

    const segments = ["..", "..", "..", "..", "The Divinity Engine 2"];
    if (project.meta.isDefinitiveMod) {
      segments.unshift("..");
      segments.push("DefEd");
    }

    const path = normalize(join(project.path, ...segments));
    return existsSync(join(path, "DivinityEngine2.exe")) ? path : undefined;
  }

  resolveGamePath(project?: ProjectInfo): string | undefined {
    if (!project) {
      return undefined;
    }

    const segments = project.meta.isDefinitiveMod
      ? ["..", "..", "..", "bin"]
      : ["..", "..", "..", "Classic"];

    const path = normalize(join(project.path, ...segments));
    return existsSync(join(path, "EoCApp.exe")) ? path : undefined;
  }

  async tryReadETag(path: string): Promise<ETagData | undefined> {
    try {
      const source = await readFile(join(path, etagFileName), "utf-8");
      const data = JSON.parse(source);
      if (data && typeof data === "object" && "etag" in data) {
        return data;
      }
    } catch (error) {}

    return undefined;
  }

  async update(showUpToDate?: boolean) {
    const localPath = this.getPath();
    if (!localPath) {
      return;
    }

    const localETag = await this.tryReadETag(localPath);
    if (!localETag) {
      return;
    }

    return new Promise(resolve => {
      const { host, path } = parse(downloadUrl);
      const handle = request(
        {
          host,
          method: "HEAD",
          path
        },
        async response => {
          const { etag } = response.headers;
          if (etag && typeof etag === "string" && etag !== localETag.etag) {
            if (!(await this.clearInstallPath(localPath))) {
              window.showErrorMessage("Could not clean up install folder.");
              return resolve();
            }

            await this.download(localPath);

            window.showInformationMessage(
              "Updated LSLib Compiler and Debugger."
            );

            window.showWarningMessage(
              "You must update the debugger installation!"
            );
          } else if (showUpToDate) {
            window.showInformationMessage(
              "LSLib Compiler and Debugger are up-to-date."
            );
          }

          resolve();
        }
      );

      handle.end();
    });
  }
}
