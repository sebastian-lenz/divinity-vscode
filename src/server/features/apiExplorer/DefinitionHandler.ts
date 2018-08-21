import Handler, { SymbolData, groupSymbols, sortSymbols } from "./Handler";
import printParameterType from "../../projects/story/utils/printParameterType";
import printParameterFlow from "../../projects/story/utils/printParameterFlow";
import printSymbolType from "../../projects/story/utils/printSymbolType";
import Symbol from "../../projects/story/Symbol";
import ucfirst from "../../utils/ucfirst";
import WikiParser from "../../documentation/raw/WikiReader";
import { CategoryData } from "../../documentation/raw/Category";
import { SymbolType } from "../../projects/story/models/symbol";

export interface Parameters {
  category: CategoryData;
  location: string;
  signatures: Array<Symbol>;
}

export default class DefinitionHandler extends Handler<Parameters> {
  async canHandle(location: string): Promise<Parameters | undefined> {
    const match = /^\/definition\/(.*)/.exec(location);
    if (!match) return undefined;

    const project = await this.feature.getProject();
    const signatures = project.story.symbols
      .findSymbols(match[1])
      .filter(symbol => symbol.type !== SymbolType.Unknown);
    if (!signatures.length) return undefined;

    const categoryName = signatures[0].category;
    if (!categoryName) return undefined;

    const category = await this.getDocumentation().getCategory(categoryName);
    if (!category) return undefined;

    return { category, location, signatures };
  }

  async loadWiki(name: string, symbols: Array<SymbolData>): Promise<any> {
    const parser = new WikiParser();
    const statusCode = await parser.load(name);
    const editLink = parser.getEditLink();

    if (statusCode === -1) {
      return { editLink, error: true };
    } else if (statusCode !== 200) {
      return { editLink, notFound: true };
    }

    const project = await this.feature.getProject();
    parser.appendLinkedSymbols(project, symbols);

    return {
      content: parser.getApiContent(),
      editLink
    };
  }

  async getResponse({
    category,
    location,
    signatures
  }: Parameters): Promise<string> {
    await this.feature.loadPartial("breadcrumbs");
    await this.feature.loadPartial("definitions");
    await this.feature.loadPartial("wiki-template");

    const signature = signatures[0];
    const type = printSymbolType(signature.type);
    const plainSignatures = signatures.map(signature => ({
      name: signature.name,
      parameters: signature.parameters.map(parameter => ({
        flow: parameter.flow ? printParameterFlow(parameter.flow) : undefined,
        name: parameter.name,
        type: parameter.type ? printParameterType(parameter.type) : undefined
      }))
    }));

    const allSymbols = await this.getSymbols(category.qualifiedName);
    const symbols = allSymbols.filter(symbol => symbol.name !== signature.name);
    const wiki = await this.loadWiki(signature.name, symbols);

    if (wiki.notFound) {
      wiki.category = type === "query" ? "Queries" : `${ucfirst(type)}s`;
      wiki.name = signature.name;
      wiki.plainType = type;
      wiki.parameters = plainSignatures[0].parameters;
      wiki.seeAlso = symbols.sort(sortSymbols);
    }

    return this.render({
      location,
      template: "definition",
      context: {
        category,
        signatures: plainSignatures,
        symbols: groupSymbols(symbols),
        title: `${ucfirst(type)} ${signature.name}`,
        type,
        wiki
      }
    });
  }
}
