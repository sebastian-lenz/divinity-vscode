import { Hover } from "vscode-languageserver";

import unpackRange from "../../parsers/story/utils/unpackRange";
import { NodeType } from "../../parsers/story/models/nodes";
import { SyncProvider, ProviderContext } from "./Provider";

export default class ConstantProvider extends SyncProvider {
  invoke({ node }: ProviderContext): Hover | null {
    let contents: Array<string> | undefined;

    if (node.type === NodeType.RealLiteral) {
      contents = [
        "**Constant real**",
        "```divinity-story-goal",
        `(REAL)${node.value}`,
        "```"
      ];
    } else if (node.type === NodeType.IntegerLiteral) {
      contents = [
        "**Constant integer**",
        "```divinity-story-goal",
        `(INTEGER)${node.value}`,
        "```"
      ];
    } else if (node.type === NodeType.StringLiteral) {
      contents = [
        "**Constant string**",
        "```divinity-story-goal",
        `(STRING)"${node.value}"`,
        "```"
      ];
    }

    if (contents) {
      return {
        contents: contents.join("\n"),
        range: unpackRange(node)
      };
    }

    return null;
  }
}
