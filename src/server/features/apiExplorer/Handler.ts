import ApiExplorerFeature from "./index";
import Documentation from "../../documentation/Documentation";
import printSymbol from "../../projects/story/utils/printSymbol";
import { SymbolType } from "../../projects/story/models/symbol";
import printSymbolType from "../../projects/story/utils/printSymbolType";
import ucfirst from "../../utils/ucfirst";

export interface SymbolData {
  name: string;
  type: string;
}

export interface SymbolGroup {
  symbols: Array<SymbolData>;
  title: string;
}

export function sortSymbols(a: SymbolData, b: SymbolData) {
  return a.name.localeCompare(b.name);
}

export function groupSymbols(symbols: Array<SymbolData>): Array<SymbolGroup> {
  const groups: { [type: string]: SymbolGroup } = {};
  for (const symbol of symbols) {
    if (!(symbol.type in groups)) {
      let title = `${ucfirst(symbol.type)}s`;
      if (title === "Querys") title = "Queries";
      groups[symbol.type] = { symbols: [], title };
    }

    groups[symbol.type].symbols.push(symbol);
  }

  return Object.keys(groups)
    .sort()
    .map(key => {
      groups[key].symbols.sort(sortSymbols);
      return groups[key];
    });
}

export default abstract class Handler<T = {}> {
  feature: ApiExplorerFeature;

  constructor(feature: ApiExplorerFeature) {
    this.feature = feature;
  }

  abstract async canHandle(location: string): Promise<T | undefined>;

  abstract async getResponse(params: T): Promise<string>;

  getDocumentation(): Documentation {
    return this.feature.server.projects.docProvider;
  }

  getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  }

  async getSymbols(categoryName: string): Promise<Array<SymbolData>> {
    const result: Array<SymbolData> = [];
    const nameMap: { [name: string]: SymbolData } = {};
    const project = await this.feature.getProject();
    const { symbols } = project.story.symbols;

    for (const symbol of symbols) {
      const { category, name } = symbol;
      if (name in nameMap || !category || !category.startsWith(categoryName)) {
        continue;
      }

      const data: SymbolData = {
        name: symbol.name,
        type: printSymbolType(symbol.type)
      };

      nameMap[name] = data;
      result.push(data);
    }

    return result;
  }

  async render({
    context,
    location,
    template
  }: {
    context: any;
    location: string;
    template: string;
  }) {
    const { feature } = this;
    const page = await feature.getTemplate(template);
    const content = page(context);

    const layout = await feature.getTemplate("layout");
    return layout({
      content,
      location,
      nonce: this.getNonce()
    });
  }
}
