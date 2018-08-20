import Handler, { groupSymbols } from "./Handler";
import { CategoryData } from "../../documentation/raw/Category";

export interface Parameters {
  category: CategoryData;
  location: string;
}

export default class CategoryHandler extends Handler<Parameters> {
  async canHandle(location: string): Promise<Parameters | undefined> {
    const documentation = this.getDocumentation();
    let category: CategoryData | null = null;

    if (location === "/") {
      category = await documentation.getCategory("root");
    }

    const match = /^\/category\/(.*)/.exec(location);
    if (match) {
      category = await documentation.getCategory(match[1]);
    }

    return category ? { category, location } : undefined;
  }

  async getResponse({ category, location }: Parameters): Promise<string> {
    await this.feature.loadPartial("breadcrumbs");
    await this.feature.loadPartial("definitions");
    const symbols = await this.getSymbols(category.qualifiedName);

    return this.render({
      location,
      template: "category",
      context: {
        category,
        symbols: groupSymbols(symbols)
      }
    });
  }
}
