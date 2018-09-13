import { compile, registerPartial } from "handlebars";
import { join } from "path";

import CategoryHandler from "./CategoryHandler";
import DefinitionHandler from "./DefinitionHandler";
import getPackagePath from "../../../shared/getPackagePath";
import Handler from "./Handler";
import Project from "../../projects/Project";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import Symbol from "../../projects/story/Symbol";
import { Feature } from "..";
import { readFile } from "../../../shared/fs";

import {
  apiRequest,
  ApiResult,
  apiLocationRequest,
  ApiLocationParams
} from "../../../shared/requests";

export default class ApiExplorerFeature extends Feature {
  handlers: Array<Handler> | undefined;
  partials: { [name: string]: boolean } = {};
  templates: { [name: string]: HandlebarsTemplateDelegate } = {};

  constructor(server: Server) {
    super(server);

    const { connection } = server;

    connection.onRequest(apiRequest, (location, token) =>
      runSafeAsync(
        () => this.handleApiRequest(location),
        null,
        `Error while fetching api ${location}`,
        token
      )
    );

    connection.onRequest(apiLocationRequest, (params, token) =>
      runSafeAsync(
        () => this.handleApiLocationRequest(params),
        null,
        `Error while fetching api location for ${params.uri}`,
        token
      )
    );
  }

  getHandlers(): Array<Handler> {
    let { handlers } = this;
    if (!handlers) {
      this.handlers = handlers = [
        new CategoryHandler(this),
        new DefinitionHandler(this)
      ];
    }

    return handlers;
  }

  async getProject(): Promise<Project> {
    const { projects } = this.server;
    if (projects.projects.length) {
      const project = projects.projects[0];
      if (!project.story.isInitializing) {
        return project;
      }
    }

    return new Promise<Project>(resolve => {
      function onProjectReady(project: Project) {
        projects.removeListener("projectReady", onProjectReady);
        resolve(project);
      }

      projects.addListener("projectReady", onProjectReady);
    });
  }

  async getTemplate(name: string) {
    const { templates } = this;
    if (!(name in this.templates)) {
      templates[name] = await this.loadTemplate("pages", name);
    }

    return templates[name];
  }

  async handleApiRequest(location: string): Promise<ApiResult | null> {
    const handlers = this.getHandlers();
    for (const handler of handlers) {
      const params = await handler.canHandle(location);
      if (params) {
        const content = await handler.getResponse(params);
        return { content, location };
      }
    }

    return null;
  }

  async handleApiLocationRequest(params: ApiLocationParams): Promise<string> {
    const { node, resource, symbol } = await this.getSymbolAt(params);
    if (!node || !resource || !symbol) {
      return "/";
    }

    let systemSymbol: Symbol | undefined;
    if (symbol.isSystem) {
      systemSymbol = symbol;
    } else if (resource) {
      const symbols = resource.story.symbols.findSymbols(symbol.name);
      systemSymbol = symbols.find(symbol => symbol.isSystem);
    }

    if (systemSymbol) {
      return `/definition/${systemSymbol.name}`;
    }

    return "/";
  }

  async loadPartial(name: string) {
    if (!this.partials[name]) {
      registerPartial(name, await this.loadTemplate("partials", name));
      this.partials[name] = true;
    }
  }

  private async loadTemplate(group: string, name: string) {
    const fileName = join(
      getPackagePath(),
      "resources",
      "templates",
      group,
      `${name}.hbs`
    );

    const input = await readFile(fileName, { encoding: "utf-8" });
    return compile(input);
  }
}
