import { normalize } from "path";
import { readFileSync } from "fs";

import Resource, { ResourceOptions } from "./Resource";
import { AnyNode } from "../../../parsers/story/models/nodes";
import { readFile } from "../../../../shared/fs";

export interface FileResourceOptions extends ResourceOptions {
  path: string;
}

export default abstract class FileResource<
  T extends AnyNode = AnyNode
> extends Resource<T> {
  readonly path: string;
  constructor(options: FileResourceOptions) {
    super(options);
    this.path = normalize(options.path);
  }

  async getSource(): Promise<string> {
    return readFile(this.path, { encoding: "utf-8" });
  }

  getSourceSync(): string {
    return readFileSync(this.path, { encoding: "utf-8" });
  }

  getUri(): string {
    return `file:///${encodeURIComponent(this.path.replace(/\\/g, "/"))}`;
  }
}
