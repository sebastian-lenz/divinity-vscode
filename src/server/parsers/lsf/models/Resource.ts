import Node from "./Node";
import Region from "./Region";

export class LSMetadata {
  buildNumber: number = 0;
  majorVersion: number = 0;
  minorVersion: number = 0;
  revision: number = 0;
  timestamp: number = 0;

  static currentMajorVersion = 33;
}

export class LSBHeader {
  bigEndian: number = 0;
  metadata: LSMetadata = new LSMetadata();
  signature: number = 0;
  totalSize: number = 0;
  unknown: number = 0;

  static signature = 0x40000000;
  static currentMajorVersion = 1;
  static currentMinorVersion = 3;
}

export default class Resource {
  metadata: LSMetadata = new LSMetadata();
  regions: { [name: string]: Region } = {};

  findNode(name: string, ...path: string[]): Node | null {
    if (name in this.regions) {
      const child = this.regions[name];
      if (path.length) {
        const [childName, ...childPath] = path;
        return child.findNode(childName, ...childPath);
      } else {
        return child;
      }
    }

    return null;
  }
}
