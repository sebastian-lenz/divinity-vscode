import { basename } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";

import Category from "./Category";
import printSymbol from "../../projects/story/utils/printSymbol";
import printSymbolType from "../../projects/story/utils/printSymbolType";
import sleep from "../../utils/sleep";
import Symbol from "../../projects/story/Symbol";
import WikiParser from "./WikiReader";
import {
  SymbolDoc,
  SymbolParameterDoc
} from "../../projects/story/models/symbol";

export interface DefinitionParameterDoc extends SymbolParameterDoc {
  customDescription?: string;
}

export interface DefinitionDoc extends SymbolDoc<DefinitionParameterDoc> {
  customDescription?: string;
  overloads?: Array<string>;
  signature?: string;
  type?: string;
}

export default class Definition {
  category: Category;
  data: DefinitionDoc;
  name: string;
  path: string;

  constructor(path: string, category: Category) {
    const { safeLoad } = require("js-yaml");

    if (existsSync(path)) {
      try {
        this.data = safeLoad(readFileSync(path, "utf-8"));
      } catch (error) {
        throw new Error(`Could not load "${path}": ${error.message}`);
      }
    } else {
      this.data = {};
    }

    this.category = category;
    this.name = basename(path, ".yml");
    this.path = path;
  }

  addOverload(symbol: Symbol) {
    const { data } = this;
    const overloads = data.overloads || (data.overloads = []);
    overloads.push(printSymbol(symbol));
  }

  async apply(symbol: Symbol) {
    console.log(`Fetching ${symbol.name}...`);
    const wiki = new WikiParser();
    await sleep();
    await wiki.load(symbol.name);

    const { data } = this;
    data.signature = printSymbol(symbol);
    data.type = printSymbolType(symbol.type);

    if (data.overloads) {
      data.overloads.length = 0;
    }

    data.description = wiki.getDescription();

    for (let index = 0; index < symbol.parameters.length; index++) {
      const target = data.parameters || (data.parameters = []);
      while (target.length <= index) {
        target.push({});
      }

      const name = symbol.parameters[index].name;
      target[index].name = name;
      target[index].description = wiki.getParameter(name);
    }
  }

  getDocumentation(): DefinitionDoc {
    const result = { ...this.data };
    if (result.customDescription) {
      result.description = result.customDescription;
      delete result.customDescription;
    }

    if (result.parameters) {
      result.parameters = result.parameters.map(parameter => {
        const result = { ...parameter };
        if (result.customDescription) {
          result.description = result.customDescription;
          delete result.customDescription;
        }

        return result;
      });
    }

    return result;
  }

  save() {
    const { safeDump } = require("js-yaml");
    const { data } = this;
    if (data.overloads && data.overloads.length === 0) {
      delete data.overloads;
    }

    writeFileSync(this.path, safeDump(this.data, { lineWidth: 200 }), "utf-8");
  }
}
