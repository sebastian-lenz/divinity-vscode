import {
  Position,
  TextDocument,
  TextDocumentEdit
} from "vscode-languageserver";

import eachNode from "../../../parsers/story/utils/eachNode";
import Projects from "../..";
import Story from "..";
import { AnyNode } from "../../../parsers/story/models/nodes";

import {
  Diagnostic,
  DiagnosticType
} from "../../../parsers/story/models/diagnostics";

export interface ResourceOptions {
  story: Story;
}

export default abstract class Resource<T extends AnyNode = AnyNode> {
  isDeleted: boolean = false;
  isInvalid: boolean = false;
  readonly story: Story;

  protected diagnostics: Array<Diagnostic> = [];
  protected document: TextDocument | null = null;
  protected rootNode: T | null = null;

  constructor(options: ResourceOptions) {
    this.load = this.load.bind(this);
    this.validate = this.validate.bind(this);
    this.story = options.story;
  }

  abstract async getSource(): Promise<string>;

  abstract getUri(): string;

  protected abstract async parse(
    source: string,
    noAnalysis?: boolean
  ): Promise<T>;

  dispose() {
    if (this.document) this.document = null;
    if (this.rootNode) this.rootNode = null;

    this.diagnostics.length = 0;
    this.getProjects().emit("diagnostics", this);
  }

  async load(noAnalysis?: boolean): Promise<T> {
    this.isInvalid = true;
    const buffer = await this.getSource();

    const rootNode = await this.parse(buffer, noAnalysis);
    if (this.document) {
      this.rootNode = rootNode;
    }

    this.isInvalid = false;
    return rootNode;
  }

  getDocument(): TextDocument | null {
    return this.document;
  }

  getDiagnostics(): Array<Diagnostic> {
    return this.diagnostics;
  }

  async getNodesAt(position: Position) {
    const { document } = this;
    const rootNode = await this.getRootNode();

    if (!rootNode || !document) {
      return null;
    }

    function findIn(parent: AnyNode) {
      for (const node of eachNode(parent)) {
        if (node.endOffset <= offset) continue;
        if (node.startOffset > offset) break;
        nodes.push(node);
        findIn(node);
        break;
      }
    }

    const offset = document.offsetAt(position);
    const nodes: Array<AnyNode> = [];
    findIn(rootNode);

    return nodes;
  }

  getProjects(): Projects {
    return this.story.project.projects;
  }

  async getRootNode(noAnalysis?: boolean): Promise<T> {
    if (this.rootNode) {
      return Promise.resolve(this.rootNode);
    }

    return this.load(noAnalysis);
  }

  getTextEdit(): TextDocumentEdit {
    return {
      edits: [],
      textDocument: {
        uri: this.getUri(),
        version: this.document ? this.document.version : null
      }
    };
  }

  invalidate() {
    if (this.isInvalid) return;
    this.isInvalid = true;

    setImmediate(() => {
      this.story.queue.add(this.validate);
    });
  }

  protected setAllDiagnostics(diagnostics: Array<Diagnostic>) {
    this.diagnostics = diagnostics;
    this.getProjects().emit("diagnostics", this);
  }

  setDocument(document: TextDocument | null) {
    this.document = document;

    if (document === null) {
      this.rootNode = null;
    }

    if (document === null && this.isDeleted) {
      this.story.removeResource(this);
    }
  }

  protected setDiagnostics(
    type: DiagnosticType,
    diagnostics: Array<Diagnostic>
  ) {
    this.diagnostics = [
      ...this.diagnostics.filter(diagnostics => diagnostics.type !== type),
      ...diagnostics
    ];

    this.getProjects().emit("diagnostics", this);
  }

  setIsDeleted(isDeleted: boolean) {
    if (this.isDeleted === isDeleted) return;
    this.isDeleted = isDeleted;
    this.story.updateTree();
  }

  async validate() {
    if (!this.isInvalid) return;
    return this.load();
  }
}
