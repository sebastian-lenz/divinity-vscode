import { extname, join, basename } from "path";
import { inflateSync } from "zlib";

import { close, readDir, stat, open, exists } from "../../../shared/fs";
import Parser, { PackedFile } from "./Parser";
import readBlock from "./utils/readBlock";
import { CompressionMethod } from "../lsf/utils/compressionMethod";
import uncompress from "./utils/uncompress";

const ignored = [
  "Effects.pak",
  "Icons.pak",
  "LowTex.pak",
  "Materials.pak",
  "Minimaps.pak",
  "SoundBanks.pak",
  "Textures.pak"
];

const goalRegExp = /Mods\/([^\/]+)\/Story\/RawFiles\/Goals\/(.*)/;
const levelRegExp = /Mods\/([^\/]+)\/(Levels|Globals)\/([^\/]+)\/(Items)\/_merged.lsf/;
const orphanQueriesRegExp = /Mods\/([^\/]+)\/Story\/story_orphanqueries_ignore_local\.txt/;
const storyHeaderRegExp = /Mods\/Shared\/Story\/RawFiles\/story_header\.div/;

export type AnyFile = PackedFile | LocalFile;

export interface LocalFile {
  path: string;
  type: "local";
}

export interface ModGoalMap {
  [name: string]: AnyFile;
}

export interface ModData {
  goals: ModGoalMap;
  localPath?: string;
  name: string;
  orphanQueries?: AnyFile;
}

export default class DataIndex extends Parser {
  packedMods: { [name: string]: ModData } = {};
  path: string | null = null;
  storyHeader: AnyFile | null = null;

  protected addFileEntry(file: PackedFile) {
    const { name } = file;

    const goal = goalRegExp.exec(name);
    if (goal) {
      const mod = this.getPackedMod(goal[1]);
      const goalName = basename(name, ".txt");
      mod.goals[goalName] = file;
    }

    const orphanQueries = orphanQueriesRegExp.exec(name);
    if (orphanQueries) {
      const mod = this.getPackedMod(orphanQueries[1]);
      mod.orphanQueries = file;
    }

    // TODO
    // const level = levelRegExp.exec(name);
    // if (level) {
    // }

    const storyHeader = storyHeaderRegExp.exec(name);
    if (storyHeader) {
      this.storyHeader = file;
    }
  }

  async getMod(name: string): Promise<ModData | null> {
    if (name !== "Shared") {
      try {
        const { path } = this;
        if (!path) throw new Error("Path not set.");

        const localPath = join(path, "Mods", name);
        const stats = await stat(localPath);
        if (stats.isDirectory()) {
          return this.loadLocalMod(name, localPath);
        }
      } catch (e) {}
    }

    return name in this.packedMods ? this.packedMods[name] : null;
  }

  protected getPackedMod(name: string): ModData {
    if (!(name in this.packedMods)) {
      this.packedMods[name] = {
        name,
        goals: {}
      };
    }

    return this.packedMods[name];
  }

  async load(path: string) {
    if (this.path) return;
    const files = await readDir(path);
    const patches: Array<string> = [];

    if (files.indexOf("Game.pak") === -1) return;
    this.path = path;

    for (const file of files.sort()) {
      const extension = extname(file);
      if (
        extension !== ".pak" ||
        /_\\d+\\.pak$/.test(file) ||
        ignored.indexOf(file) !== -1
      ) {
        continue;
      }

      if (/^Patch/.test(file)) {
        patches.push(file);
      } else {
        await this.loadPackage(file);
      }
    }

    for (const patch of patches) {
      await this.loadPackage(patch);
    }
  }

  async loadFile(file: PackedFile): Promise<Buffer> {
    let { path } = file;
    if (file.archivePart !== 0) {
      path = `${path.substr(0, path.length - 4)}_${file.archivePart}.pak`;
    }

    const fd = await open(path, "r");
    const compressed = Buffer.alloc(file.sizeOnDisk);
    await readBlock(fd, compressed, file.offsetInFile);
    await close(fd);

    switch ((file.flags & 0x0f) as CompressionMethod) {
      case CompressionMethod.None:
        return compressed;

      case CompressionMethod.Zlib:
        return inflateSync(compressed);

      case CompressionMethod.LZ4:
        const decompressed = Buffer.alloc(file.uncompressedSize);
        uncompress(compressed, decompressed);
        return decompressed;

      default:
        throw new Error("Unknown package compression.");
    }
  }

  async loadTextFile(file: PackedFile): Promise<string> {
    const buffer = await this.loadFile(file);
    return buffer.toString();
  }

  protected async loadLocalMod(name: string, path: string): Promise<ModData> {
    let goals: ModGoalMap = {};
    let orphanQueries: AnyFile | undefined;

    try {
      const goalPath = join(path, "Story", "RawFiles", "Goals");
      const stats = await stat(goalPath);
      if (stats.isDirectory()) {
        const files = await readDir(goalPath);
        for (const file of files) {
          if (extname(file) !== ".txt") continue;
          goals[basename(file, ".txt")] = {
            path: join(goalPath, file),
            type: "local"
          };
        }
      }

      const orphanQueriesPath = join(
        path,
        "Story",
        "story_orphanqueries_ignore_local.txt"
      );

      if (await exists(orphanQueriesPath)) {
        orphanQueries = {
          path: orphanQueriesPath,
          type: "local"
        };
      }
    } catch (e) {}

    return { goals, localPath: path, name, orphanQueries };
  }

  protected async loadPackage(file: string) {
    const { path } = this;
    if (!path) return;

    return this.readPackage(join(path, file));
  }
}
