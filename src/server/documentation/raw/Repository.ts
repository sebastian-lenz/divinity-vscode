import { join, sep } from "path";

import Category from "./Category";
import Definition from "./Definition";
import getPackagePath from "../../../shared/getPackagePath";
import Project from "../../projects/Project";
import Projects from "../../projects";
import Symbol from "../../projects/story/Symbol";
import Documentation from "../Documentation";
import { mkdirSync } from "fs";
import { writeFile } from "../../../shared/fs";

export default class Repository {
  categories: Array<Category>;
  definitions: Array<Definition>;
  path: string;
  rootCategory: Category;

  constructor(path: string = join(getPackagePath(), "docs")) {
    const root = new Category(join(path, "definitions"));

    this.categories = root.getAllCategories();
    this.definitions = root.getAllDefinitions();
    this.path = path;
    this.rootCategory = root;
  }

  async compile() {
    const rimraf = require("rimraf");
    const cachePath = join(this.path, "cache");
    rimraf.sync(`${cachePath}${sep}*`);
    mkdirSync(cachePath);

    const docs = new Documentation();
    docs.repository = this;
    docs.useRepository = true;

    let data: any = await docs.getSymbolCategories();
    await writeFile(join(cachePath, "index.json"), JSON.stringify(data));

    for (const category of this.categories) {
      data = category.getCategoryData();
      await writeFile(
        join(cachePath, `category.${category.qualifiedName}.json`),
        JSON.stringify(data)
      );
    }

    for (const definition of this.definitions) {
      data = definition.getDocumentation();
      await writeFile(
        join(cachePath, `definition.${definition.name.toLowerCase()}.json`),
        JSON.stringify(data)
      );
    }
  }

  createDefinition(name: string): Definition {
    let definition = this.getDefinition(name);
    if (definition) return definition;

    const fileName = join(this.rootCategory.path, `${name}.yml`);
    definition = new Definition(fileName, this.rootCategory);

    this.rootCategory.definitions.push(definition);
    this.definitions.push(definition);
    return definition;
  }

  getCategory(name: string): Category | undefined {
    return this.categories.find(category => category.qualifiedName === name);
  }

  getDefinition(name: string): Definition | undefined {
    name = name.toLowerCase();
    return this.definitions.find(
      definition => definition.name.toLowerCase() === name
    );
  }

  async update(path: string) {
    const projects = new Projects();
    const project = await projects.tryCreateForFolder(path);
    if (!project) {
      throw new Error("Could not load project: " + path);
    }

    console.log("Loading project...");
    project.initialize();
    await project.story.whenReady();

    console.log("Collecting symbols...");
    await this.updateDefinitions(project.story.symbols.symbols);

    projects.dispose();
  }

  async updateDefinitions(symbols: Array<Symbol>) {
    const definitions: Array<Definition> = [];
    let definition: Definition | undefined;

    for (const symbol of symbols) {
      if (symbol.isSystem) {
        const definition = this.createDefinition(symbol.name);
        await definition.apply(symbol);
        definitions.push(definition);
      } else {
        definition = this.getDefinition(symbol.name);
        if (definition) {
          definition.addOverload(symbol);
        }
      }
    }

    for (const definition of definitions) {
      definition.save();
    }

    for (const oldDefinition of this.definitions) {
      if (!definitions.some(def => def.name === oldDefinition.name)) {
        console.log(`Deprecated definition: ${oldDefinition.name}`);
      }
    }
  }
}
