import { join } from "path";
import { readFileSync, writeFileSync } from "fs";

import FileResource, { FileResourceOptions } from "./FileResource";
import HeaderGoalResource from "./HeaderGoalResource";
import HeaderParser from "../../../parsers/story/HeaderParser";

import {
  HeaderNode,
  HeaderGoalNode,
  DefinitionNode
} from "../../../parsers/story/models/nodes";

export default class HeaderResource extends FileResource<HeaderNode> {
  ignoredGoals: Array<string>;
  ignoredPath: string;

  constructor(options: FileResourceOptions) {
    super(options);

    const ignoredPath = join(
      options.story.project.path,
      "Story",
      "story_custom_goals.txt"
    );

    let ignoredGoals: Array<string>;
    try {
      const data = readFileSync(ignoredPath, "utf-8");
      ignoredGoals = JSON.parse(data);
    } catch (error) {
      ignoredGoals = [];
    }

    this.ignoredGoals = ignoredGoals;
    this.ignoredPath = ignoredPath;
  }

  addIgnoredGoal(name: string) {
    const { ignoredGoals, ignoredPath } = this;
    if (ignoredGoals.indexOf(name) !== -1) return;
    ignoredGoals.push(name);

    try {
      writeFileSync(ignoredPath, JSON.stringify(ignoredGoals));
    } catch (error) {}
  }

  loadSync(noAnalysis?: boolean) {
    const source = this.getSourceSync();
    this.parse(source, noAnalysis);
  }

  protected async parse(
    source: string,
    noAnalysis?: boolean
  ): Promise<HeaderNode> {
    const parser: HeaderParser = new HeaderParser(source);
    const { header } = parser.parse();

    this.syncDefinitions(header.definitions);
    this.syncGoals(header.goals);
    this.syncTypeAliases(header.typeAliases);

    this.story.symbols.update();
    return header;
  }

  private syncDefinitions(definitions: Array<DefinitionNode>) {
    const { symbols } = this.story;

    for (const definition of definitions) {
      symbols.addSystemSymbol(definition);
    }
  }

  private syncGoals(nodes: Array<HeaderGoalNode>) {
    const { story } = this;
    const existingResources = story.getHeaderGoalResources();
    const resources: Array<HeaderGoalResource> = [];

    for (const node of nodes) {
      if (!node.title || this.ignoredGoals.indexOf(node.title) !== -1) continue;
      const name = node.title;
      let resource = existingResources.find(
        resource => resource.goal.name === name
      );

      if (!resource) {
        if (story.getGoal(name) !== null) {
          continue;
        }

        resource = new HeaderGoalResource({ name, story });
        story.addResource(resource);
      }

      if (resource) {
        resource.update(nodes, node);
        resources.push(resource);
      }
    }

    existingResources
      .filter(resource => resources.indexOf(resource) === -1)
      .forEach(resource => story.removeResource(resource));
  }

  private syncTypeAliases(aliases: Array<string>) {
    const { types } = this.story;
    for (const alias of aliases) {
      if (types.indexOf(alias) === -1) {
        types.push(alias);
      }
    }
  }
}
