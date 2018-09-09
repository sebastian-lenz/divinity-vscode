import { join, normalize } from "path";
import {
  ProgressLocation,
  ShellExecution,
  ShellQuotedString,
  ShellQuoting,
  Task,
  tasks,
  TaskDefinition,
  TaskGroup,
  TaskProcessEndEvent,
  TaskProvider,
  TaskRevealKind,
  TaskStartEvent,
  workspace,
  window
} from "vscode";

import Client from "../../Client";
import debounce from "../../../server/utils/debounce";
import Feature from "../Feature";
import { LSLibFile } from "../../utils/LSLib";

import {
  projectAddedEvent,
  ProjectInfo,
  ProjectEventArgs
} from "../../../shared/notifications";

function quotedString(value: string): ShellQuotedString {
  return { quoting: ShellQuoting.Strong, value };
}

const modes: Array<[string, ReloadMode]> = [
  ["Compile", ReloadMode.None],
  ["Compile, reload story", ReloadMode.ReloadStory],
  ["Compile, reload story and level", ReloadMode.ReloadLevelAndStory]
];

const taskTitle = "Divinity";
const reloadTaskTitle = "Reload editor";
const compilerTaskType = "divinity.task.compiler";
const reloadTaskType = "divinity.task.reload";
const problemMatcher = "$divinity.problemMatcher";

export const enum ReloadMode {
  None = "",
  ReloadStory = "reloadStory",
  ReloadLevelAndStory = "reloadLevelAndStory"
}

export interface DivinityTaskDefinition extends TaskDefinition {
  checkNames?: boolean;
  checkOnly?: boolean;
  debugInfo?: string;
  debugLog?: string;
  game: "dos2" | "dos2de";
  gameDataPath: string;
  mod: Array<string>;
  noWarn?: Array<string>;
  output: string;
  reload?: ReloadMode;
  type: "divinity.task.compiler";
}

export default class TaskProviderFeature extends Feature
  implements TaskProvider {
  projects: Array<ProjectInfo> = [];
  tasks: Array<Task> = [];

  constructor(client: Client) {
    super(client);

    client.addListener(projectAddedEvent, this.handleProjectAdded);
    tasks.onDidStartTask(this.handleDidStartTask);
    tasks.onDidEndTaskProcess(this.handleDidEndTaskProcess);
    workspace.onDidChangeConfiguration(this.handleDidChangeConfiguration);
    workspace.registerTaskProvider(compilerTaskType, this);
  }

  async createTasks() {
    const { projects } = this;
    const result: Array<Task> = [];
    const compilerLogPath = workspace
      .getConfiguration("divinity")
      .get<string>("compilerLogPath");

    if (!this.getCompilerPath()) {
      this.tasks = result;
      return;
    }

    for (const project of projects) {
      for (const [caption, mode] of modes) {
        const definition: DivinityTaskDefinition = {
          debugInfo: join(project.path, "Story", "story.debugInfo"),
          game: project.meta.isDefinitiveMod ? "dos2de" : "dos2",
          gameDataPath: normalize(join(project.path, "..", "..")),
          mod: [
            "Shared",
            ...project.meta.dependencies.map(dependency => dependency.folder),
            project.meta.folder
          ],
          output: join(project.path, "Story", "story.div.osi"),
          type: compilerTaskType
        };

        if (mode !== ReloadMode.None) {
          definition.reload = mode;
        }

        if (compilerLogPath) {
          definition.debugLog = compilerLogPath;
        }

        const task = new Task(definition, caption, project.meta.name);
        task.group = TaskGroup.Build;
        task.problemMatchers = [problemMatcher];
        task.presentationOptions = {
          reveal: TaskRevealKind.Silent
        };

        const resolved = await this.resolveTask(task);
        if (resolved) {
          result.push(resolved);
        }
      }
    }

    this.tasks = result;
  }

  getCompilerPath(): string | undefined {
    return this.client.lslib.resolve(LSLibFile.Compiler);
  }

  getRconPath(): string | undefined {
    return this.client.lslib.resolve(LSLibFile.Rcon);
  }

  handleProjectAdded = async ({ project }: ProjectEventArgs) => {
    const { projects } = this;
    projects.push(project);

    return this.createTasks();
  };

  handleDidChangeConfiguration = debounce(() => {
    this.createTasks();
  }, 500);

  handleDidEndTaskProcess = async (event: TaskProcessEndEvent) => {
    const { definition, scope } = event.execution.task;
    if (definition.type !== compilerTaskType) return;

    if (event.exitCode === 0) {
      window.showInformationMessage("Story successful compiled");
    } else {
      window.showErrorMessage("Story compile failed");
    }

    const { reload } = definition as DivinityTaskDefinition;
    const rconPath = await this.getRconPath();
    if (rconPath && reload && scope && event.exitCode === 0) {
      const task = new Task(
        {
          type: reloadTaskType
        },
        scope,
        reloadTaskTitle,
        taskTitle,
        new ShellExecution(quotedString(rconPath), ["127.0.0.1:5384", reload])
      );

      task.presentationOptions = {
        reveal: TaskRevealKind.Never
      };

      tasks.executeTask(task);
    }
  };

  handleDidStartTask = (event: TaskStartEvent) => {
    const { definition } = event.execution.task;
    if (definition.type !== compilerTaskType) {
      return;
    }

    const createProgress = () =>
      new Promise(resolve => {
        const listener = tasks.onDidEndTaskProcess(event => {
          const { definition } = event.execution.task;
          if (definition.type !== compilerTaskType) {
            return;
          }

          listener.dispose();
          resolve();
        });
      });

    window.withProgress(
      {
        cancellable: false,
        location: ProgressLocation.Notification,
        title: `Compiling...`
      },
      createProgress
    );
  };

  provideTasks(): Array<Task> {
    return this.tasks;
  }

  async resolveTask(task: Task): Promise<Task | undefined> {
    const { definition } = task;
    const compilerPath = await this.getCompilerPath();
    if (!compilerPath || definition.type !== compilerTaskType) {
      return undefined;
    }

    const {
      checkNames,
      checkOnly,
      debugInfo,
      debugLog,
      game,
      gameDataPath,
      mod,
      noWarn,
      output
    } = definition as DivinityTaskDefinition;

    const args = [
      "--game-data-path",
      quotedString(gameDataPath.replace(/[\/\\]$/, "")),
      "--output",
      quotedString(output),
      "--game",
      quotedString(game)
    ];

    if (debugInfo) {
      args.push("--debug-info", quotedString(debugInfo));
    }

    if (debugLog) {
      args.push("--debug-log", quotedString(debugLog));
    }

    for (const modName of mod) {
      args.push("--mod", quotedString(modName));
    }

    if (noWarn) {
      for (const noWarnName of noWarn) {
        args.push("--no-warn", quotedString(noWarnName));
      }
    }

    if (checkOnly) {
      args.push("--check-only");
    }

    if (checkNames) {
      args.push("--check-names");
    }

    task.execution = new ShellExecution(quotedString(compilerPath), args);
    return task;
  }
}
