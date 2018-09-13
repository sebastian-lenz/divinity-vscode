import { TextSearchQuery, TextSearchOptions } from "vscode";

// Div search request

export const divSearchRequest = "divinity/divSearch";

export interface DivSearchParams {
  options: TextSearchOptions;
  query: TextSearchQuery;
}
