import Story from "./index";
import { ModData } from "../../parsers/pak/DataIndex";
import Symbol from "./Symbol";
import { readFile } from "../../../shared/fs";

export interface Orphan {
  name: string;
  numParameters: number;
  source?: string;
}

export default class OrphanQueries {
  orphans: Array<Orphan> = [];
  story: Story;

  constructor(story: Story) {
    this.story = story;
  }

  isOrphan(symbol: Symbol): boolean {
    return this.orphans.some(
      orphan =>
        orphan.name === symbol.name &&
        orphan.numParameters === symbol.numParameters
    );
  }

  async loadLocal(path: string) {
    const data = await readFile(path, "UTF-8");
    this.parse(data);
  }

  parse(data: string, source?: string) {
    const orphans = this.orphans.filter(orphan => orphan.source !== source);
    const regexp = /^([A-Za-z0-9_-]+) (\d+)/gm;
    data = data.replace(/\r\n|\r/g, "\n");

    let match: RegExpExecArray | null = null;
    while ((match = regexp.exec(data))) {
      orphans.push({
        name: match[1],
        numParameters: parseInt(match[2]),
        source
      });
    }

    this.orphans = orphans;
  }

  async loadDependency(mod: ModData) {
    if (!mod.orphanQueries) {
      return;
    }

    const data = await this.story.project.load(mod.orphanQueries);
    this.parse(data, mod.name);
  }

  removeLocal() {
    this.orphans = this.orphans.filter(orphan => !orphan.source);
  }
}
