import { Hover } from "vscode-languageserver";

import ucfirst from "../../utils/ucfirst";
import unpackRange from "../../parsers/story/utils/unpackRange";
import { NodeType } from "../../parsers/story/models/nodes";
import { SyncProvider, ProviderContext } from "./Provider";

export default class GuidProvider extends SyncProvider {
  invoke({ node, resource }: ProviderContext): Hover | null {
    if (node.type !== NodeType.GuidLiteral) return null;

    const { levels } = resource.story.project;
    const instance = levels.instances.find(
      instance => instance.guid === node.guid
    );

    let instanceInfo = "";
    if (instance) {
      instanceInfo = `${ucfirst(instance.type)} "${instance.name}" from level ${
        instance.level
      }`;
    }

    return {
      contents: [
        "**GUID reference**  ",
        instanceInfo,
        "```divinity-story-goal",
        `(GUIDSTRING)${node.guid}`,
        "```"
      ].join("\n"),
      range: unpackRange(node)
    };
  }
}
