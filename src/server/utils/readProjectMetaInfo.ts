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
    region: Array<LSRegion> | LSRegion;
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

interface LSRegion {
  $: {
    id: string;
  };
  node: Array<LSNode> | LSNode;
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
  attribute?: Array<LSNodeAttribute>;
  children?: {
    node: Array<LSNode> | LSNode;
  };
}

function findNodeById(nodes: Array<LSNode> | LSNode | null, id: string) {
  if (!nodes) return null;
  if (Array.isArray(nodes)) {
    return nodes.find(node => node.$.id === id) || null;
  } else {
    return nodes.$.id === id ? nodes : null;
  }
}

function findRegionById(file: LSFile, id: string) {
  let region: LSRegion | undefined = undefined;
  if (Array.isArray(file.save.region)) {
    region = file.save.region.find(region => region.$.id === id);
  } else {
    region = file.save.region.$.id === id ? file.save.region : undefined;
  }

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
  if (!node.attribute) {
    return result;
  }

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

function readChildNodes(node: LSNode): Array<LSNode> {
  if (!node.children) return [];
  return Array.isArray(node.children.node)
    ? node.children.node
    : [node.children.node];
}

function readDependencies(node: LSNode): Array<ProjectMetaDependency> {
  return readChildNodes(node)
    .map(node => {
      try {
        return node.$.id === "ModuleShortDesc" ? readAttributes(node) : null;
      } catch (error) {
        return null;
      }
    })
    .filter((child: any) => isProjectMetaDependency(child));
}

export default function readProjectMetaInfo(data: LSFile): ProjectMetaInfo {
  const result: Partial<ProjectMetaInfo> = { dependencies: [] };
  const config = findRegionById(data, "Config");
  const root = findNodeById(config, "root");
  if (!root || !root.children) {
    throw new Error("Invalid project metadata.");
  }

  for (const node of readChildNodes(root)) {
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
