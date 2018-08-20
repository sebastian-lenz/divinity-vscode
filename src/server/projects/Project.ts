import Levels from "./levels/index";
import Projects from ".";
import Story from "./story";
import { ProjectInfo, ProjectMetaInfo } from "../../shared/notifications";

export default class Project implements ProjectInfo {
  readonly levels: Levels;
  readonly meta: ProjectMetaInfo;
  readonly path: string;
  readonly projects: Projects;
  readonly story: Story;

  constructor(projects: Projects, info: ProjectInfo) {
    this.levels = new Levels(this);
    this.meta = info.meta;
    this.path = info.path;
    this.projects = projects;
    this.story = new Story(this);
  }

  dispose() {
    this.story.dispose();
    this.levels.dispose();
  }

  getInfo(): ProjectInfo {
    return {
      meta: this.meta,
      path: this.path
    };
  }

  initialize() {
    this.story.initialize();
  }
}
