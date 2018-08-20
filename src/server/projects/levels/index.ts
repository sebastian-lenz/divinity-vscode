import LSFParser from "../../parsers/lsf/Parser";
import Project from "../Project";
import FileWatcher from "../../projects/FileWatcher";
import { readFile } from "../../../shared/fs";

const allowedTypes = ["character", "item", "leveltemplate", "trigger"];

export type InstanceType = "character" | "item" | "leveltemplate" | "trigger";

export interface FileInfo {
  path: string;
  guid: string;
  level: string;
}

export interface InstanceInfo extends FileInfo {
  name: string;
  type: InstanceType;
}

export const enum LevelsInitState {
  Idle,
  Scanning,
  Loading,
  Ready
}

export default class Levels {
  readonly project: Project;
  initState: LevelsInitState = LevelsInitState.Idle;
  instances: Array<InstanceInfo> = [];
  isProcessing: boolean = false;
  lsfReader: LSFParser = new LSFParser();
  pending: Array<FileInfo> = [];
  watcher: FileWatcher | null = null;

  constructor(project: Project) {
    this.project = project;
  }

  dispose() {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
  }

  getFileInfo(path: string): FileInfo | null {
    const match = /([^\\\/]+)[\\\/][^\\\/]+[\\\/]([0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12})\.lsf$/.exec(
      path
    );

    return match
      ? {
          path,
          guid: match[2],
          level: match[1]
        }
      : null;
  }

  initialize() {
    try {
      const watcher = new FileWatcher({
        path: this.project.path,
        pattern: /(Globals|Levels)[\\\/]([^\\\/]+)[\\\/](Characters|Items|LevelTemplates|Splines|Triggers)[\\\/](.*?).lsf$/,
        recursive: true
      });

      this.initState = LevelsInitState.Scanning;

      watcher.on("update", this.handleFileUpdate);
      watcher.on("remove", this.handleFileRemove);
      watcher.scanAndStart().then(() => {
        if (!this.isProcessing) {
          this.initState = LevelsInitState.Ready;
          this.project.projects.emit("levelInitReady", this.project);
        } else {
          this.initState = LevelsInitState.Loading;
        }
      });

      this.project.projects.emit("levelInitStart", this.project);
      this.watcher = watcher;
    } catch (error) {
      this.initState = LevelsInitState.Ready;
      this.project.projects.emit("showError", error.message);
    }
  }

  async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const { instances, pending } = this;
    let info: FileInfo | undefined;

    while ((info = pending.shift())) {
      let instance: InstanceInfo | null | undefined;
      try {
        instance = await this.read(info);
      } catch (e) {}

      if (instance) {
        const guid = instance.guid;
        const index = instances.findIndex(inst => inst.guid === guid);

        if (index === -1) {
          instances.push(instance);
        } else {
          instances[index] = instance;
        }
      }
    }

    this.isProcessing = false;
    if (this.initState === LevelsInitState.Loading) {
      this.initState = LevelsInitState.Ready;
      this.project.projects.emit("levelInitReady", this.project);
    }
  }

  async read(info: FileInfo): Promise<InstanceInfo | null> {
    const buffer = await readFile(info.path);
    const resource = this.lsfReader.read(buffer);
    const node = resource.findNode("Templates", "GameObjects");
    let result: InstanceInfo | null = null;

    if (node) {
      const name = node.getStringAttribute("Name");
      const type = node.getStringAttribute("Type");

      if (name && !name.startsWith("S_")) {
        return null;
      }

      if (name && type && allowedTypes.indexOf(type) !== -1) {
        result = {
          ...info,
          guid: info.guid.toLowerCase(),
          name,
          type: type as InstanceType
        };
      }
    }

    return result;
  }

  handleFileUpdate = (path: string) => {
    const info = this.getFileInfo(path);
    if (info) {
      this.pending.push(info);
      this.process();
    }
  };

  handleFileRemove = (path: string) => {
    const info = this.getFileInfo(path);
    if (info) {
      const { guid } = info;
      this.instances = this.instances.filter(info => info.guid !== guid);
      this.pending = this.pending.filter(info => info.guid !== guid);
    }
  };
}
