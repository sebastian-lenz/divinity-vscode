import { Hover } from "vscode-languageserver";

import unpackRange from "../../parsers/story/utils/unpackRange";
import { NodeType } from "../../parsers/story/models/nodes";
import { SyncProvider, ProviderContext } from "./Provider";
import { InstanceInfo } from "../../projects/levels";
import { ParameterType } from "../../projects/story/models/parameter";

function printInstanceType(instance: InstanceInfo): string {
  switch (instance.type) {
    case ParameterType.TriggerGuid:
      return "Trigger";
    case ParameterType.CharacterGuid:
      return "Character";
    case ParameterType.ItemGuid:
      return "Item";
    case ParameterType.SplineGuid:
      return "Spline";
    case ParameterType.LevelTemplateGuid:
      return "Level template";
  }

  return "Unknown";
}

export default class GuidProvider extends SyncProvider {
  invoke({ node, resource }: ProviderContext): Hover | null {
    if (node.type !== NodeType.GuidLiteral) return null;

    const { levels } = resource.story.project;
    const instance = levels.instances.find(
      instance => instance.guid === node.guid
    );

    let instanceInfo = "";
    if (instance) {
      instanceInfo = `${printInstanceType(instance)} "${
        instance.name
      }" from level ${instance.level}`;
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
