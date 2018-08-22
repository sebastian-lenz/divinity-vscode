import lcfirst from "./lcfirst";
import {
  ProjectMetaInfo,
  ProjectMetaDependency
} from "../../shared/notifications";

interface LSFile {
  save: {
    header: Array<{
      $: {
        time: string;
        version: string;
      };
    }>;
    region: Array<{
      $: {
        id: string;
      };
      node: Array<LSNode>;
    }>;
    version: Array<{
      $: {
        build: string;
        major: string;
        minor: string;
        revision: string;
      };
    }>;
  };
}

interface LSNodeAttribute {
  $: {
    id: string;
    type: string;
    value: string;
  };
}

interface LSNode {
  $: {
    id: string;
  };
  attribute: Array<LSNodeAttribute>;
  children: Array<{ node: Array<LSNode> }>;
}

function findNodeById(nodes: Array<LSNode> | null, id: string) {
  if (!nodes) return null;
  return nodes.find(node => node.$.id === id) || null;
}

function findRegionById(file: LSFile, id: string) {
  const region = file.save.region.find(region => region.$.id === id);
  return region ? region.node : null;
}

function isProjectMetaDependency(value: any): value is ProjectMetaDependency {
  return (
    typeof value === "object" &&
    "uuid" in value &&
    "name" in value &&
    "folder" in value
  );
}

function readAttributes(node: LSNode, result: any = {}): any {
  for (const { $ } of node.attribute) {
    const { id, value } = $;
    let key: string;

    switch (id) {
      case "GMTemplate":
        key = "gmTemplate";
        break;
      case "MD5":
        key = "md5";
        break;
      case "UUID":
        key = "uuid";
        break;
      default:
        key = lcfirst(id);
    }

    result[key] = value;
  }

  return result;
}

function readDependencies(node: LSNode): Array<ProjectMetaDependency> {
  return node.children
    .map(child => {
      const shortDesc = child.node.find(
        node => node.$.id === "ModuleShortDesc"
      );
      return shortDesc ? readAttributes(shortDesc) : null;
    })
    .filter((child: any) => isProjectMetaDependency(child));
}

export default function readProjectMetaInfo(data: LSFile): ProjectMetaInfo {
  const result: Partial<ProjectMetaInfo> = { dependencies: [] };
  const config = findRegionById(data, "Config");
  const root = findNodeById(config, "root");
  if (!root) {
    throw new Error("Invalid project metadata.");
  }

  for (const node of root.children[0].node) {
    if (node.$.id === "ModuleInfo") {
      readAttributes(node, result);
    } else if (node.$.id === "Dependencies") {
      result.dependencies = readDependencies(node);
    }
  }

  if (!isProjectMetaDependency(result)) {
    throw new Error("Missing project metadata.");
  }

  return result as ProjectMetaInfo;
}
