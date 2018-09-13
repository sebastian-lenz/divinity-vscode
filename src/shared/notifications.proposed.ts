import { Range } from "vscode-languageclient";

// Div search result

export const divSearchResultEvent = "divinity/divSearchResult";

export interface DivSearchResultArgs {
  preview: {
    match: Range;
    text: string;
  };
  range: Range;
  uri: string;
}
