import { EventEmitter } from "events";
import { normalize, join, resolve } from "path";

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
  readonly docProvider: Documentation = new Documentation();
  readonly projects: Array<Project> = [];

  dispose() {
    const { projects } = this;
    projects.forEach(project => project.dispose());
    projects.length = 0;
  }

  findProjectByPath(path: string): Project | null {
    path = normalize(path);
    return this.projects.find(project => project.path === path) || null;
  }

  findProjectByUid(uid: string) {
    return this.projects.find(project => project.meta.UUID === uid) || null;
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

  async findResourceByPath(path: string | null): Promise<Resource | null> {
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

  async tryGetProjectInfo(path: string): Promise<ProjectInfo | null> {
    path = normalize(path);
    try {
      const data = await readXmlFile(join(path, "meta.lsx"));
      return {
        meta: readProjectMetaInfo(data),
        path
      };
    } catch (e) {}

    return null;
  }

  async tryCreateForFolder(initialPath: string): Promise<Project | null> {
    let path = resolve(initialPath);
    let nextPath = path;

    do {
      path = nextPath;
      nextPath = resolve(path, "..");

      const info = await this.tryGetProjectInfo(path);
      if (info) {
        let project = this.findProjectByPath(info.path);
        if (!project) {
          project = new Project(this, info);
          this.projects.push(project);
          this.emit("projectAdded", project);

          project.initialize();
        }

        return project;
      }
    } while (path !== nextPath);

    return null;
  }
}
