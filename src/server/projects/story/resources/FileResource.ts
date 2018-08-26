import { normalize } from "path";
import { readFileSync } from "fs";

import Resource, { ResourceOptions } from "./Resource";
import { AnyFile } from "../../../parsers/pak/DataIndex";
import { AnyNode } from "../../../parsers/story/models/nodes";
import { readFile } from "../../../../shared/fs";

export interface FileResourceOptions extends ResourceOptions {
  file: AnyFile;
}

export default abstract class FileResource<
  T extends AnyNode = AnyNode
> extends Resource<T> {
  readonly path: string;
  readonly file: AnyFile;

  constructor(options: FileResourceOptions) {
    super(options);
    this.file = options.file;
    this.path = normalize(options.file.path);
  }

  async getSource(): Promise<string> {
    if (this.file.type === "local") {
      return readFile(this.path, { encoding: "utf-8" });
    } else {
      const { dataIndex } = this.story.project.projects;
      return dataIndex.loadTextFile(this.file);
    }
  }

  getSourceSync(): string {
    return readFileSync(this.path, { encoding: "utf-8" });
  }

  getUri(): string {
    return `file:///${encodeURIComponent(this.path.replace(/\\/g, "/"))}`;
  }
}
