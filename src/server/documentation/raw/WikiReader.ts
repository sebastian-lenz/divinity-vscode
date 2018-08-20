import fetch from "../../utils/fetch";
import { SymbolData } from "../../features/apiExplorer/Handler";
import Project from "../../projects/Project";
import printSymbolType from "../../projects/story/utils/printSymbolType";

const wikiUrl = "https://docs.larian.game";
const wikiApiPath = "Osiris/API/";

function extractContent(value: string): string {
  const titleTag = /^<(h[1-6])/.exec(value);
  if (titleTag) {
    const end = value.indexOf(`</${titleTag[1]}>`);
    if (end !== -1) {
      value = value.substr(end);
    }
  }

  return sanitize(value).trim();
}

function extractParameters(value: string): Array<WikiParameter> {
  const matcher = /<li[^>]*>(.*?)<\/li>/g;
  const result: Array<WikiParameter> = [];
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(value))) {
    const chunk = sanitize(match[1]).trim();
    const splitAt = /[: ]/.exec(chunk);
    if (splitAt) {
      result.push({
        content: chunk.substr(splitAt.index + 1).trim(),
        name: chunk.substr(0, splitAt.index).trim()
      });
    }
  }

  return result;
}

function sanitize(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function symbolFromPath(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith("/")) path = path.substr(1);

  const params = /index\.php\?title=([^&]+)/.exec(path);
  if (params) path = params[1];

  if (!path.startsWith(wikiApiPath)) return null;

  path = path.substr(wikiApiPath.length);
  if (path.indexOf("#") !== -1) path = path.substr(0, path.indexOf("#"));
  if (path.indexOf("?") !== -1) path = path.substr(0, path.indexOf("?"));
  return path;
}

function transformLink(string: string, url: string): string {
  const symbolName = symbolFromPath(url);
  if (symbolName) {
    return `href="#" data-goto="/definition/${symbolName}"`;
  } else {
    return `href="${wikiUrl}${url}"`;
  }
}

function transformLinks(string: string): string {
  return string.replace(/href="([^"]*)"/g, transformLink);
}

export interface WikiData {
  links: Array<{
    "*": string;
  }>;
  sections: Array<{
    anchor: string;
    line: string;
  }>;
  text: {
    "*": string;
  };
}

export interface WikiSection {
  content: string;
  title: string;
}

export interface WikiParameter {
  content: string;
  name: string;
}

export default class WikiParser {
  code: number = -1;
  data: WikiData | undefined;
  title: string = "";
  private parameters: Array<WikiParameter> | undefined;
  private sections: Array<WikiSection> | undefined;
  private text: string = "";

  async load(title: string): Promise<number> {
    const { code, data } = await this.fetch(title);
    this.code = code;
    this.data = data;
    this.sections = undefined;
    this.text = data ? data.text["*"] : "";
    this.title = title;

    return code;
  }

  appendLinkedSymbols(
    project: Project,
    symbols: Array<SymbolData>
  ): Array<SymbolData> {
    const { data } = this;
    if (!data) return symbols;

    for (const link of data.links) {
      const name = symbolFromPath(link["*"]);
      if (!name) continue;

      const compare = name.toLowerCase();
      if (symbols.some(({ name }) => name.toLowerCase() === compare)) {
        continue;
      }

      const storySymbols = project.story.symbols.findSymbols(name);
      if (storySymbols.length) {
        symbols.push({
          name,
          type: printSymbolType(storySymbols[0].type)
        });
      }
    }

    return symbols;
  }

  getApiContent(): string {
    return this.getSections()
      .filter(
        section =>
          section.title.indexOf("Definition") === -1 &&
          section.title.indexOf("See") === -1
      )
      .map(section => section.content)
      .join("");
  }

  getDescription(): string {
    const description = this.getSections().find(
      section => section.title.indexOf("Description") !== -1
    );

    return description ? extractContent(description.content) : "";
  }

  getEditLink(): string {
    const params = [
      "action=edit",
      `title=${encodeURIComponent(`${wikiApiPath}${this.title}`)}`
    ];

    return `${wikiUrl}/index.php?${params.join("&")}`;
  }

  getParameter(name: string): string {
    name = name.toLowerCase();
    const parameter = this.getParameters().find(
      paramater => paramater.name.toLowerCase() === name
    );

    return parameter ? parameter.content : "";
  }

  getParameters() {
    if (!this.parameters) {
      const parameters = this.getSections().find(
        section => section.title.indexOf("Parameters") !== -1
      );

      this.parameters = parameters ? extractParameters(parameters.content) : [];
    }

    return this.parameters;
  }

  getSections(): Array<WikiSection> {
    if (!this.sections) {
      const { text } = this;
      const splitter = /<h[1-6]/g;
      let from = 0;
      let match: RegExpExecArray | null;

      this.sections = [];
      while ((match = splitter.exec(text))) {
        this.addSection(from, splitter.lastIndex - 3);
        from = splitter.lastIndex - 3;
      }

      this.addSection(from, text.length);
    }

    return this.sections;
  }

  private addSection(from: number, to: number) {
    const { data, sections } = this;
    if (!data || !sections) return;

    const part = this.text.substring(from, to);
    for (const section of data.sections) {
      if (part.indexOf(`id="${section.anchor}"`) === -1) {
        continue;
      }

      sections.push({
        content: transformLinks(part),
        title: section.line
      });
    }
  }

  private async fetch(name: string) {
    const pageName = `${wikiApiPath}${name}`;
    const params = [
      "action=parse",
      "format=json",
      "disabletoc=true",
      "disableeditsection=true",
      `page=${encodeURIComponent(pageName)}`
    ];

    const url = `${wikiUrl}/api.php?${params.join("&")}`;
    const { code, content } = await fetch(url);
    if (code !== 200) {
      return { code };
    }

    try {
      const data = JSON.parse(content);
      if ("error" in data) {
        return { code: 404 };
      } else {
        return { code: 200, data: data.parse };
      }
    } catch (error) {}

    return { code: -1 };
  }
}
