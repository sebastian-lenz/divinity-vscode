import { readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

import Definition from "./Definition";
import ucfirst from "../../utils/ucfirst";

export interface CategoryInfoData {
  displayName: string;
  name: string;
  qualifiedName: string;
}

export interface CategoryData extends CategoryInfoData {
  children: Array<CategoryInfoData>;
  parents: Array<CategoryInfoData>;
}

export default class Category {
  definitions: Array<Definition>;
  displayName: string;
  name: string;
  children: Array<Category>;
  parent: Category | undefined;
  path: string;
  qualifiedName: string;

  constructor(path: string, parent?: Category) {
    const definitions: Array<Definition> = [];
    const names = readdirSync(path);
    const namespaces: Array<Category> = [];

    this.name = parent ? basename(path) : "root";
    this.qualifiedName = parent
      ? `${parent.qualifiedName}.${this.name}`
      : this.name;

    for (const name of names) {
      const fileName = join(path, name);
      const stats = statSync(fileName);

      if (stats.isDirectory()) {
        namespaces.push(new Category(fileName, this));
      } else if (extname(fileName) === ".yml") {
        definitions.push(new Definition(fileName, this));
      }
    }

    let displayName = ucfirst(this.name);
    if (!parent) {
      displayName = "Divinity API";
    }

    this.definitions = definitions;
    this.displayName = displayName;
    this.children = namespaces;
    this.parent = parent;
    this.path = path;
  }

  getAllCategories(): Array<Category> {
    return this.children.reduce(
      (result, category) => {
        return [...result, ...category.getAllCategories()];
      },
      [this] as Array<Category>
    );
  }

  getAllDefinitions(): Array<Definition> {
    return this.children.reduce((result, category) => {
      return [...result, ...category.getAllDefinitions()];
    }, this.definitions);
  }

  getCategoryInfoData(): CategoryInfoData {
    return {
      displayName: this.displayName,
      name: this.name,
      qualifiedName: this.qualifiedName
    };
  }

  getCategoryData(): CategoryData {
    return {
      ...this.getCategoryInfoData(),
      children: this.children.map(child => child.getCategoryInfoData()),
      parents: this.getParents().map(parent => parent.getCategoryInfoData())
    };
  }

  getParents(): Array<Category> {
    const { parent } = this;
    const result: Array<Category> = parent ? parent.getParents() : [];
    if (parent) result.push(parent);
    return result;
  }
}
