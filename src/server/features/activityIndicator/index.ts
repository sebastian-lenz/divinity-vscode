import Feature from "../Feature";
import Project from "../../projects/Project";
import Server from "../../Server";

import {
  levelIndexReadyEvent,
  levelIndexStartEvent,
  projectAddedEvent,
  ProjectEventArgs,
  projectReadyEvent,
  ShowErrorArgs,
  showErrorEvent
} from "../../../shared/notifications";

export default class ActivityIndicatorFeature extends Feature {
  treeVersion: number = 0;

  constructor(server: Server) {
    super(server);

    server.projects.on("levelInitStart", this.handleLevelInitStart);
    server.projects.on("levelInitReady", this.handleLevelInitReady);

    server.projects.on("projectAdded", this.handleProjectAdded);
    server.projects.on("projectReady", this.handleProjectReady);

    server.projects.on("showError", this.handleShowError);
  }

  handleLevelInitStart = (project: Project) => {
    this.server.connection.sendNotification(levelIndexStartEvent, {
      project: project.getInfo()
    } as ProjectEventArgs);
  };

  handleLevelInitReady = (project: Project) => {
    this.server.connection.sendNotification(levelIndexReadyEvent, {
      project: project.getInfo()
    } as ProjectEventArgs);
  };

  handleProjectAdded = (project: Project) => {
    this.server.connection.sendNotification(projectAddedEvent, {
      project: project.getInfo()
    } as ProjectEventArgs);
  };

  handleProjectReady = (project: Project) => {
    this.server.connection.sendNotification(projectReadyEvent, {
      project: project.getInfo()
    } as ProjectEventArgs);
  };

  handleShowError = (message: string) => {
    this.server.connection.sendNotification(showErrorEvent, {
      message
    } as ShowErrorArgs);
  };
}
