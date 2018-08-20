export const apiShowEvent = "divinity/apiShow";
export const divRequestEvent = "divinity/divRequest";
export const divRequestResultEvent = "divinity/divRequestResult";
export const goalsChangedEvent = "divinity/goalsChanged";
export const readyEvent = "divinity/ready";

export interface DivRequestResult {
  content: string | null;
  uri: string;
}

export interface GoalsChanged {
  goals: Array<GoalInfo>;
  project: ProjectInfo;
  treeVersion: number;
}

export interface ProjectInfo {
  meta: ProjectMetaInfo;
  path: string;
}

export interface ProjectMetaInfo {
  Author?: string;
  CharacterCreationLevelName?: string;
  Description?: string;
  Folder: string;
  GMTemplate?: string;
  LobbyLevelName?: string;
  MD5?: string;
  MenuLevelName?: string;
  Name: string;
  NumPlayers?: string;
  PhotoBooth?: string;
  StartupLevelName?: string;
  Tags?: string;
  Type?: string;
  UUID: string;
  Version?: string;
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
