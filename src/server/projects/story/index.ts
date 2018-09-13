import * as Queue from "promise-queue";
import { join, normalize } from "path";

import Analyzers from "./analyzers";
import FileResource from "./resources/FileResource";
import FileWatcher from "../FileWatcher";
import Goal from "./Goal";
import GoalResource from "./resources/GoalResource";
import HeaderResource from "./resources/HeaderResource";
import OrphanQueries from "./OrphanQueries";
import Project from "../Project";
import Resource from "./resources/Resource";
import sortGoals from "./utils/sortGoals";
import Symbols from "./Symbols";
import { existsSync } from "fs";

export default class Story {
  isInitializing: boolean = true;

  readonly analyzers: Analyzers = new Analyzers(this);
  readonly orphanQueries: OrphanQueries = new OrphanQueries(this);
  readonly project: Project;
  readonly symbols: Symbols = new Symbols(this);
  readonly queue: Queue;
  readonly types: Array<string> = [
    "INTEGER",
    "INTEGER64",
    "REAL",
    "STRING",
    "GUIDSTRING"
  ];

  private goals: Array<Goal> = [];
  private resources: Array<Resource> = [];
  private watchers: Array<FileWatcher> | null = null;

  constructor(project: Project) {
    this.project = project;
    this.queue = new Queue(1, Number.POSITIVE_INFINITY, {
      onEmpty: this.handleQueueEmpty
    });
  }

  addGoal(goal: Goal) {
    const overrides = this.findGoal(goal.name);
    if (overrides) {
      this.removeGoal(overrides, true);
      goal.overrides = overrides;
    }

    const { goals } = this;
    goals.push(goal);

    for (const goal of goals) {
      if (goal.parents.indexOf(goal.name) !== -1) {
        goal.resource.invalidate();
      }
    }

    this.updateTree();
  }

  async analyzeGoals() {
    if (this.isInitializing) {
      return;
    }

    for (const resource of this.resources) {
      if (
        resource instanceof GoalResource &&
        !resource.isDeleted &&
        !resource.isHeaderGoal()
      ) {
        await resource.analyze();
      }
    }
  }

  dispose() {
    if (this.watchers) {
      this.watchers.forEach(watcher => watcher.dispose());
      this.watchers = null;
    }
  }

  findGoal(name: string): Goal | null {
    return (
      this.goals.find(goal => goal.name === name && !goal.resource.isDeleted) ||
      null
    );
  }

  findOrCreateResource(path: string): FileResource | null {
    let resource = this.findResource(path);
    if (resource) return resource;

    const rawPath = this.getGoalsPath();
    if (existsSync(rawPath) && path.startsWith(rawPath)) {
      resource = new GoalResource({
        file: { path, type: "local" },
        story: this
      });

      this.resources.push(resource);
      return resource;
    }

    return null;
  }

  findResource(path: string): FileResource | null {
    return (
      (this.resources.find(
        file => file instanceof FileResource && file.path === path
      ) as FileResource) || null
    );
  }

  getHeaderGoalResources(): Array<GoalResource> {
    return this.resources.filter(
      resource => resource instanceof GoalResource && resource.isHeaderGoal()
    ) as Array<GoalResource>;
  }

  getGoal(name: string): Goal | null {
    return this.goals.find(goal => goal.name === name) || null;
  }

  getGoals(): Array<Goal> {
    return this.goals.slice();
  }

  getGoalsByParent(parent: string): Array<Goal> {
    return this.goals.filter(goal => goal.parents.indexOf(parent) !== -1);
  }

  getGoalsPath(): string {
    return normalize(join(this.project.path, "Story", "RawFiles", "Goals"));
  }

  getStoryPath(): string {
    return normalize(join(this.project.path, "Story"));
  }

  getRootGoals(): Array<Goal> {
    return this.goals.filter(goal => goal.parents.length === 0);
  }

  getSortedRootGoals(): Array<Goal> {
    return this.getRootGoals().sort(sortGoals);
  }

  async initialize() {
    await this.loadDependencies();
    this.watchers = this.createWatchers();
  }

  removeGoal(goal: Goal, isOverride?: boolean) {
    this.goals = this.goals.filter(existingGoal => existingGoal !== goal);
    this.symbols.removeByGoal(goal);

    if (!isOverride && goal.overrides) {
      this.goals.push(goal.overrides);
    }

    this.updateTree();
  }

  removeResource(resource: Resource) {
    this.resources = this.resources.filter(existing => existing !== resource);
    resource.dispose();
  }

  updateTree() {
    if (this.isInitializing) {
      return;
    }

    const { project } = this;
    Goal.updateWeights(this.getRootGoals());
    project.projects.emit("goalsChanged", project);
  }

  async whenReady(): Promise<void> {
    if (this.isInitializing) {
      return new Promise<void>(resolve => {
        const { projects } = this.project;
        const onReady = (project: Project) => {
          if (project !== this.project) return;
          projects.removeListener("projectReady", onReady);
          resolve();
        };
        projects.addListener("projectReady", onReady);
      });
    } else {
      return Promise.resolve();
    }
  }

  private createGoalWatcher(): FileWatcher {
    const watcher = new FileWatcher({
      path: this.getGoalsPath(),
      pattern: /\.txt$/
    });

    watcher.on("update", path => {
      let resource = this.findResource(path);
      if (!resource) {
        resource = new GoalResource({
          file: { path, type: "local" },
          story: this
        });

        this.resources.push(resource);
      }

      resource.setIsDeleted(false);
      this.queue.add(resource.load);
    });

    watcher.on("remove", path => {
      const resource = this.findResource(path);
      if (resource) {
        if (resource.getDocument()) {
          resource.setIsDeleted(true);
        } else {
          this.removeResource(resource);
        }
      }
    });

    watcher.scanAndStartSync();
    return watcher;
  }

  private createOrphanWatcher() {
    const watcher = new FileWatcher({
      path: this.getStoryPath(),
      pattern: /story_orphanqueries_ignore_local\.txt$/
    });

    watcher.on("update", async path => {
      await this.orphanQueries.loadLocal(path);
      this.analyzeGoals();
    });

    watcher.on("remove", path => {
      this.orphanQueries.removeLocal();
    });

    watcher.scanAndStartSync();
    return watcher;
  }

  private createWatchers(): Array<FileWatcher> {
    const watchers: Array<FileWatcher> = [];

    try {
      watchers.push(this.createGoalWatcher());
      watchers.push(this.createOrphanWatcher());
    } catch (error) {
      this.project.projects.emit("showError", error.message);
    }

    if (this.queue.getPendingLength() === 0) {
      this.handleQueueEmpty();
    }

    return watchers;
  }

  private handleQueueEmpty = async () => {
    if (this.isInitializing && this.watchers) {
      const { project, symbols } = this;

      this.isInitializing = false;
      this.updateTree();

      await symbols.loadMetaData();
      symbols.update();

      project.projects.emit("projectReady", this.project);

      await this.analyzeGoals();
      project.levels.initialize();
    }
  };

  private async loadDependencies() {
    const { dataIndex } = this.project.projects;
    const dependencies = ["Shared"];
    const resources: Array<Resource> = [];

    for (const { folder } of this.project.meta.dependencies) {
      if (dependencies.indexOf(folder) === -1) {
        dependencies.push(folder);
      }
    }

    const { storyHeader } = dataIndex;
    if (!storyHeader) {
      throw new Error(`Could not locate story headers.`);
    }

    resources.push(
      new HeaderResource({
        file: storyHeader,
        story: this
      })
    );

    for (const dependency of dependencies) {
      const mod = await dataIndex.getMod(dependency);
      if (!mod) {
        throw new Error(`Could not load project dependency "${dependency}"`);
      }

      for (const goalName of Object.keys(mod.goals)) {
        resources.push(
          new GoalResource({
            file: mod.goals[goalName],
            headerGoal: true,
            name: goalName,
            story: this
          })
        );
      }

      await this.orphanQueries.loadDependency(mod);
    }

    this.resources.push(...resources);
    for (const resource of resources) {
      await resource.load();
    }
  }
}
