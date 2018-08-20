import { join } from "path";

import getPackagePath from "../../shared/getPackagePath";
import Repository from "./raw/Repository";
import { CategoryData } from "./raw/Category";
import { DefinitionDoc } from "./raw/Definition";
import { readFile } from "../../shared/fs";

export interface SymbolCategoryMap {
  [symbol: string]: string;
}

export default class Documentation {
  cachePath: string;
  repository: Repository | null = null;
  useRepository: boolean = false;

  constructor() {
    this.cachePath = join(getPackagePath(), "docs", "cache");
  }

  async getCategory(name: string): Promise<CategoryData | null> {
    if (this.useRepository) {
      const repository = this.getRepository();
      const category = repository.getCategory(name);

      return category ? category.getCategoryData() : null;
    }

    const cacheFile = join(this.cachePath, `category.${name}.json`);
    return this.readCache<CategoryData>(cacheFile);
  }

  async getDocumentation(name: string): Promise<DefinitionDoc | null> {
    if (this.useRepository) {
      const repository = this.getRepository();
      const definition = repository.getDefinition(name);

      return definition ? definition.getDocumentation() : null;
    }

    const cacheFile = join(
      this.cachePath,
      `definition.${name.toLowerCase()}.json`
    );

    return this.readCache<DefinitionDoc>(cacheFile);
  }

  getRepository() {
    if (!this.repository) {
      this.repository = new Repository();
    }

    return this.repository;
  }

  async getSymbolCategories(): Promise<SymbolCategoryMap | null> {
    if (this.useRepository) {
      const result: SymbolCategoryMap = {};
      const repository = this.getRepository();

      for (const definition of repository.definitions) {
        const searchName = definition.name.toLowerCase();
        result[searchName] = definition.category.qualifiedName;
      }

      return result;
    }

    const cacheFile = join(this.cachePath, `index.json`);
    return this.readCache<SymbolCategoryMap>(cacheFile);
  }

  async readCache<T>(path: string): Promise<T | null> {
    try {
      const data = await readFile(path, { encoding: "utf-8" });
      return JSON.parse(data) as T;
    } catch (error) {
      return null;
    }
  }
}
