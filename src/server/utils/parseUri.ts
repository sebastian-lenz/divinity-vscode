import { normalize } from "path";

export type ParsedUri =
  | {
      type: "path";
      path: string;
    }
  | {
      goal: string;
      project: string;
      type: "header";
    }
  | null;

export default function parseUri(uri: string): ParsedUri {
  uri = decodeURIComponent(uri);
  if (uri.startsWith("file:///")) {
    return {
      type: "path",
      path: normalize(uri.substr(8))
    };
  }

  const match = /divinity:\/([^/]+)\/(.*?)\.divGoal/.exec(uri);
  if (match) {
    return {
      goal: match[2],
      project: match[1],
      type: "header"
    };
  }

  return null;
}
