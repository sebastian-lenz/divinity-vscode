import { join, dirname } from "path";
import { LanguageClient, Event } from "vscode-languageclient";
import {
  commands,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  window,
  TreeItemCollapsibleState,
  Uri,
  workspace
} from "vscode";

import Client from "../../Client";
import goalTemplate from "../../../shared/goalTemplate";
import { Feature } from "..";
import { exists, unlink, writeFile, rename } from "../../../shared/fs";

import {
  goalsChangedEvent,
  GoalsChanged,
  GoalInfo,
  ProjectInfo
} from "../../../shared/notifications";

import {
  renameGoalRequest,
  RenameGoalParams,
  RenameGoalResult,
  MoveGoalParams,
  MoveGoalResult,
  moveGoalRequest,
  DivContentParams,
  DivContentResult,
  divContentRequest
} from "../../../shared/requests";

export default class StoryOutlineFeature extends Feature
  implements TreeDataProvider<GoalInfo> {
  emitter: EventEmitter<GoalInfo | null>;
  iconCustom: { dark: string; light: string };
  iconShared: { dark: string; light: string };
  project: ProjectInfo | null = null;
  onDidChangeTreeData: Event<GoalInfo | null>;
  rootGoals: Array<GoalInfo> = [];
  treeVersion: number = -1;

  constructor(client: Client) {
    super(client);
    this.emitter = new EventEmitter();
    this.iconCustom = this.createIcon("goal-custom");
    this.iconShared = this.createIcon("goal-shared");
    this.onDidChangeTreeData = this.emitter.event;

    window.registerTreeDataProvider("divinity.storyOutline", this);

    commands.registerCommand(
      "divinity.storyOutline.addGoal",
      this.handleAddGoal
    );

    commands.registerCommand(
      "divinity.storyOutline.deleteGoal",
      this.handleDeleteGoal
    );

    commands.registerCommand(
      "divinity.storyOutline.moveGoal",
      this.handleMoveGoal
    );

    commands.registerCommand(
      "divinity.storyOutline.openGoal",
      this.handleOpenGoal
    );

    commands.registerCommand(
      "divinity.storyOutline.renameGoal",
      this.handleRenameGoal
    );

    commands.registerCommand(
      "divinity.storyOutline.copyGoal",
      this.handleCopyGoal
    );
  }

  initialize(connection: LanguageClient) {
    connection.onNotification(goalsChangedEvent, this.handleGoalsChanged);
  }

  collectChildren(
    goal: GoalInfo,
    result: Array<GoalInfo> = []
  ): Array<GoalInfo> {
    result.push(...goal.children);
    for (const child of goal.children) {
      this.collectChildren(child, result);
    }

    return result;
  }

  async createGoal(
    name: string | undefined,
    content: string,
    ignoreExisting?: boolean
  ) {
    name = this.validateNewGoalName(name, ignoreExisting);
    if (!name) return;

    const fileName = this.getGoalFileName(name);
    if (!fileName) {
      window.showErrorMessage("Cannot create goal: No project opened.");
      return;
    }

    if (await exists(fileName)) {
      window.showErrorMessage(
        "Cannot create goal: Target file already exists."
      );
      return;
    }

    try {
      await writeFile(fileName, content);
    } catch (error) {
      window.showErrorMessage(`Cannot create goal: ${error.message}`);
      return;
    }

    window.showTextDocument(Uri.file(fileName));
  }

  createIcon(name: string) {
    const { context } = this.client;
    return {
      dark: context.asAbsolutePath(
        join("resources", "icons", `${name}-dark.svg`)
      ),
      light: context.asAbsolutePath(
        join("resources", "icons", `${name}-light.svg`)
      )
    };
  }

  findGoal(name: string, scope?: GoalInfo): GoalInfo | null {
    const children = scope ? scope.children : this.rootGoals;
    for (const child of children) {
      if (child.name.toLowerCase() === name.toLowerCase()) {
        return child;
      }

      const childGoal = this.findGoal(name, child);
      if (childGoal) {
        return childGoal;
      }
    }

    return null;
  }

  getGoalFileName(name: string): string | undefined {
    const { project } = this;
    if (!project) return undefined;
    return join(project.path, "Story", "RawFiles", "Goals", `${name}.txt`);
  }

  getTreeItem(element: GoalInfo): TreeItem {
    let state = TreeItemCollapsibleState.None;
    if (element.children.length) {
      state = TreeItemCollapsibleState.Collapsed;
    }

    const { iconCustom, iconShared } = this;
    const item = new TreeItem(element.name, state);
    item.resourceUri = Uri.parse(element.uri);
    item.contextValue = element.isShared ? "sharedGoal" : "customGoal";
    item.iconPath = element.isShared ? iconShared : iconCustom;
    item.command = {
      command: "divinity.storyOutline.openGoal",
      title: "Open Goal",
      arguments: [element]
    };

    return item;
  }

  getChildren(element?: GoalInfo | undefined): ProviderResult<Array<GoalInfo>> {
    return element ? element.children : this.rootGoals;
  }

  getMoveTargets(
    goal: GoalInfo,
    scope?: GoalInfo,
    depth: string = "",
    result: Array<string> = []
  ): Array<string> {
    const children = scope ? scope.children : this.rootGoals;
    for (const child of children) {
      if (child !== goal) {
        result.push(`${depth}${child.name}`);
        this.getMoveTargets(goal, child, `${depth}\t`, result);
      }
    }

    return result;
  }

  handleAddGoal = async (goal?: GoalInfo) => {
    let name = await window.showInputBox({
      prompt: "Enter the name of the new goal:"
    });

    await this.createGoal(
      name,
      goalTemplate({
        parents: goal ? [goal.name] : undefined
      })
    );
  };

  handleCopyGoal = async (goal?: GoalInfo | null) => {
    if (!goal) return;

    goal = this.findGoal(goal.name);
    if (!goal || !goal.isShared) {
      window.showErrorMessage("This goal cannot be copied to your mod.");
      return;
    }

    const connection = await this.client.getConnection();
    const params: DivContentParams = {
      uri: goal.uri
    };

    const result = await connection.sendRequest<DivContentResult | null>(
      divContentRequest,
      params
    );

    if (!result) {
      window.showErrorMessage("The goal could not be loaded.");
      return;
    }

    await this.createGoal(goal.name, result.content, true);
  };

  handleDeleteGoal = async (goal?: GoalInfo | null) => {
    if (!goal) return;

    goal = this.findGoal(goal.name);
    if (!goal || goal.isShared) {
      window.showErrorMessage("This goal cannot be deleted.");
      return;
    }

    const goalsToDelete = this.collectChildren(goal).filter(
      goal => !goal.isShared
    );

    goalsToDelete.push(goal);

    if (goalsToDelete.length > 1) {
      const result = await window.showQuickPick(["Yes", "No"], {
        placeHolder: `This will delete ${
          goalsToDelete.length
        } goals. Are you sure?`
      });
      if (result === "No") return;
    }

    for (const goalToDelete of goalsToDelete) {
      try {
        await unlink(Uri.parse(goalToDelete.uri).fsPath);
      } catch (error) {
        window.showErrorMessage(
          `Could not delete "${goalToDelete.name}": ${error.message}`
        );
      }
    }
  };

  handleMoveGoal = async (goal?: GoalInfo) => {
    const { project } = this;
    if (!goal || !project) return;

    const targets = this.getMoveTargets(goal);
    let newParent = await window.showQuickPick(targets, {
      placeHolder: "Select the new parent"
    });

    if (!newParent) return;
    const connection = await this.client.getConnection();
    const params: MoveGoalParams = {
      goalName: goal.name,
      newParent: newParent.trim(),
      projectUid: project.meta.uuid
    };

    const result = await connection.sendRequest<MoveGoalResult>(
      moveGoalRequest,
      params
    );

    if (result.error) {
      window.showErrorMessage(result.error);
      return;
    }

    const converter = connection.protocol2CodeConverter;
    const workspaceEdit = converter.asWorkspaceEdit(result);
    const didEdit = await workspace.applyEdit(workspaceEdit);
    if (!didEdit) {
      window.showErrorMessage("The move could not be performed.");
      return;
    }
  };

  handleOpenGoal = (goal?: GoalInfo) => {
    if (goal) {
      window.showTextDocument(Uri.parse(goal.uri));
    }
  };

  handleRenameGoal = async (goal?: GoalInfo) => {
    const { project } = this;
    if (!goal || !project) return;

    let newName = await window.showInputBox({
      prompt: "Enter the new name of the goal:",
      value: goal.name
    });

    newName = this.validateNewGoalName(newName);
    if (!newName) return;

    const connection = await this.client.getConnection();
    const params: RenameGoalParams = {
      goalName: goal.name,
      newName,
      projectUid: project.meta.uuid
    };

    const result = await connection.sendRequest<RenameGoalResult>(
      renameGoalRequest,
      params
    );

    if (result.error) {
      window.showErrorMessage(result.error);
      return;
    }

    const converter = connection.protocol2CodeConverter;
    const workspaceEdit = converter.asWorkspaceEdit(result);
    const didEdit = await workspace.applyEdit(workspaceEdit);
    if (!didEdit) {
      window.showErrorMessage("The rename could not be performed.");
      return;
    }

    const from = Uri.parse(goal.uri).fsPath;
    const to = join(dirname(from), `${newName}.txt`);
    await rename(from, to);

    window.showTextDocument(Uri.file(to));
  };

  handleGoalsChanged = (event: GoalsChanged) => {
    if (!this.project) {
      this.project = event.project;
      commands.executeCommand(
        "setContext",
        "divinity.storyOutline.enabled",
        true
      );
    } else {
      if (event.project.path !== this.project.path) return;
    }

    if (event.treeVersion > this.treeVersion) {
      this.rootGoals = event.goals;
      this.treeVersion = event.treeVersion;
      this.emitter.fire();
    }
  };

  validateNewGoalName(
    name: string | undefined,
    ignoreExisting?: boolean
  ): string | undefined {
    if (!name) return undefined;
    if (name.endsWith(".txt")) {
      name = name.substr(0, name.length - 4);
    }

    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      window.showErrorMessage(`The goal name "${name}" is invalid.`);
      return undefined;
    }

    if (!ignoreExisting) {
      const existingGoal = this.findGoal(name);
      if (existingGoal) {
        window.showErrorMessage(`The goal "${name}" already exists.`);
        return undefined;
      }
    }

    return name;
  }
}
