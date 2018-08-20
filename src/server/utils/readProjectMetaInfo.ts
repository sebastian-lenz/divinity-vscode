import { ProjectMetaInfo } from "../../shared/notifications";

export default function readProjectMetaInfo(data: any): ProjectMetaInfo {
  const params = data.save.region[0].node[0].children[0].node;
  const result: any = {};

  for (const param of params) {
    if (param.$.id === "ModuleInfo") {
      for (const { $ } of param.attribute) {
        const { id, value } = $;
        result[id] = value;
      }
    }
  }

  if (!("UUID" in result) || !("Name" in result)) {
    throw new Error("Missing project metadata.");
  }

  return result as ProjectMetaInfo;
}
