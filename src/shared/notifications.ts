export const goalsChangedEvent = "divinity/goalsChanged";
export const readyEvent = "divinity/ready";

export interface GoalsChanged {
  goals: Array<GoalInfo>;
  project: ProjectInfo;
  treeVersion: number;
}

export interface ProjectInfo {
  meta: ProjectMetaInfo;
  path: string;
}

export interface ProjectMetaDependency {
  folder: string;
  md5?: string;
  name: string;
  uuid: string;
  version?: string;
}

export interface ProjectMetaInfo extends ProjectMetaDependency {
  author?: string;
  characterCreationLevelName?: string;
  dependencies: Array<ProjectMetaDependency>;
  description?: string;
  gmTemplate?: string;
  isDefinitiveMod: boolean;
  lobbyLevelName?: string;
  menuLevelName?: string;
  numPlayers?: string;
  photoBooth?: string;
  startupLevelName?: string;
  tags?: string;
  type?: string;
}

export interface GoalInfo {
  children: Array<GoalInfo>;
  isShared: boolean;
  name: string;
  uri: string;
}

// Error event

export const showErrorEvent = "divinity/showError";

export interface ShowErrorArgs {
  message: string;
}

// Project events

export const projectAddedEvent = "divinity/projectAdded";
export const projectReadyEvent = "divinity/projectReady";
export const levelIndexStartEvent = "divinity/levelIndexStart";
export const levelIndexReadyEvent = "divinity/levelIndexReady";

export interface ProjectEventArgs {
  project: ProjectInfo;
}
