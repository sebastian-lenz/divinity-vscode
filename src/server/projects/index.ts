import { EventEmitter } from "events";
import { normalize, join, resolve } from "path";

import DataIndex from "../parsers/pak/DataIndex";
import Documentation from "../documentation/Documentation";
import parseUri, { ParsedUri } from "../utils/parseUri";
import Project from "./Project";
import readProjectMetaInfo from "../utils/readProjectMetaInfo";
import readXmlFile from "../utils/readXmlFile";
import Resource from "./story/resources/Resource";
import { ProjectInfo } from "../../shared/notifications";

/**
 * @event "diagnostics" (goal: AbstractGoal)
 * @event "goalsChanged" (project: Project)
 * @event "levelInitStart" (project: Project)
 * @event "levelInitReady" (project: Project)
 * @event "projectAdded" (project: Project)
 * @event "projectReady" (project: Project)
 * @event "showError" (string: message)
 */
export default class Projects extends EventEmitter {
  readonly dataIndex: DataIndex = new DataIndex();
  readonly docProvider: Documentation = new Documentation();
  readonly pendingProjects: { [path: string]: Promise<Project> } = {};
  readonly projects: Array<Project> = [];

  dispose() {
    const { projects } = this;
    projects.forEach(project => project.dispose());
    projects.length = 0;
  }

  findProjectByUid(uid: string) {
    return this.projects.find(project => project.meta.uuid === uid) || null;
  }

  async findResource(uri: string | ParsedUri | null): Promise<Resource | null> {
    if (typeof uri === "string") {
      uri = parseUri(uri);
    }

    if (!uri) {
      return null;
    }

    if (uri.type === "path") {
      return this.findResourceByPath(uri.path);
    }

    const project = this.findProjectByUid(uri.project);
    if (!project) {
      return null;
    }

    const goal = project.story.findGoal(uri.goal);
    return goal ? goal.resource : null;
  }

  async tryCreateForFolder(initialPath: string): Promise<Project | null> {
    let path = resolve(initialPath);
    let nextPath = path;

    do {
      path = nextPath;
      nextPath = resolve(path, "..");

      const info = this.tryGetProjectInfo(path);
      if (info) {
        return this.loadProject(info);
      }
    } while (path !== nextPath);

    return null;
  }

  private findProjectByPath(path: string): Project | null {
    path = normalize(path);
    return this.projects.find(project => project.path === path) || null;
  }

  private async findResourceByPath(
    path: string | null
  ): Promise<Resource | null> {
    if (!path) {
      return null;
    }

    for (const project of this.projects) {
      const file = project.story.findOrCreateResource(path);
      if (file) {
        return file;
      }
    }

    const project = await this.tryCreateForFolder(path);
    if (project) {
      return project.story.findResource(path);
    }

    return null;
  }

  private async loadProject(info: ProjectInfo): Promise<Project> {
    const { dataIndex, pendingProjects, projects } = this;
    const { path } = info;
    let project = this.findProjectByPath(path);
    if (project) {
      return project;
    }

    if (!(path in pendingProjects)) {
      pendingProjects[path] = new Promise<Project>(async resolve => {
        project = new Project(this, info);
        this.emit("projectAdded", project);

        await dataIndex.load(normalize(join(path, "..", "..")));
        await project.initialize();

        projects.push(project);
        delete pendingProjects[path];
        resolve(project);
      });
    }

    return pendingProjects[info.path];
  }

  private tryGetProjectInfo(path: string): ProjectInfo | null {
    path = normalize(path);
    try {
      const data = readXmlFile(join(path, "meta.lsx"));
      if (!data) {
        return null;
      }

      return {
        meta: readProjectMetaInfo(data),
        path
      };
    } catch (e) {}

    return null;
  }
}
