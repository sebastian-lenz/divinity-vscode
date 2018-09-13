import {
  WorkspaceEdit,
  TextDocumentPositionParams
} from "vscode-languageclient";

// API request

export const apiRequest = "divinity/api";

export interface ApiResult {
  content: string;
  location: string;
}

// API location request

export const apiLocationRequest = "divinity/apiLocation";

export interface ApiLocationParams extends TextDocumentPositionParams {}

// Rename goal

export const renameGoalRequest = "divinity/renameGoal";

export interface RenameGoalParams {
  goalName: string;
  newName: string;
  projectUid: string;
}

export interface RenameGoalResult extends WorkspaceEdit {
  error?: string;
}

// Move goal

export const moveGoalRequest = "divinity/moveGoal";

export interface MoveGoalParams {
  goalName: string;
  newParent: string;
  projectUid: string;
}

export interface MoveGoalResult extends WorkspaceEdit {
  error?: string;
}

// Div content request

export const divContentRequest = "divinity/divContent";

export interface DivContentParams {
  uri: string;
}

export interface DivContentResult {
  content: string;
  uri: string;
}
