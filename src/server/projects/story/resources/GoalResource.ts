import { basename } from "path";

import GoalParser from "../../../parsers/story/GoalParser";
import {
  DiagnosticType,
  Diagnostic
} from "../../../parsers/story/models/diagnostics";
import { StoryGoalNode } from "../../../parsers/story/models/nodes";

import FileResource, { FileResourceOptions } from "./FileResource";
import Goal from "../Goal";
import Story from "..";

export interface GoalResourceOptions extends FileResourceOptions {
  name?: string;
  headerGoal?: boolean;
}

export default class GoalResource extends FileResource<StoryGoalNode> {
  readonly goal: Goal;
  readonly headerGoal: boolean;
  readonly story: Story;

  private syntaxDiagnostics: Array<Diagnostic> = [];

  constructor(options: GoalResourceOptions) {
    super(options);

    const { file, story } = options;
    let { name } = options;
    if (!name) name = basename(file.path, ".txt");

    const goal = new Goal(story, name, this);
    story.addGoal(goal);

    this.goal = goal;
    this.headerGoal = !!options.headerGoal;
    this.story = story;
  }

  async analyze() {
    const { syntaxDiagnostics } = this;
    const node = await this.getRootNode(true);

    this.diagnostics = syntaxDiagnostics;
    this.setDiagnostics([
      ...syntaxDiagnostics,
      ...(await this.story.analyzers.apply(this, node))
    ]);
  }

  dispose() {
    super.dispose();
    this.story.removeGoal(this.goal);
  }

  async getSource(): Promise<string> {
    const { document } = this;
    if (document) {
      return Promise.resolve(document.getText());
    }

    return super.getSource();
  }

  getUri(): string {
    if (this.file.type === "pak") {
      const { goal, story } = this;
      const { uuid } = story.project.meta;
      return `divinity:///${uuid}/${goal.name}.divGoal`;
    }

    return `file:///${encodeURIComponent(this.path.replace(/\\/g, "/"))}`;
  }

  isHeaderGoal(): boolean {
    return this.headerGoal;
  }

  protected async parse(
    source: string,
    noAnalysis?: boolean
  ): Promise<StoryGoalNode> {
    const { goal, story } = this;
    const parser = new GoalParser(source);
    const { diagnostics, goal: node } = parser.parse();
    this.syntaxDiagnostics = diagnostics;

    if (noAnalysis) {
      story.symbols.assignSymbols(node);
      return node;
    }

    story.symbols.updateGoal(goal, node);

    const parents = node.parentTargetEdges;
    goal.setParents(
      parents ? parents.map(parentEdge => parentEdge.name.value) : []
    );

    story.symbols.update();

    if (!story.isInitializing && !this.headerGoal) {
      // Set the parser errors silently so analyzers can see them
      this.diagnostics = diagnostics;
      this.setAllDiagnostics([
        ...diagnostics,
        ...(await story.analyzers.apply(this, node))
      ]);
    } else {
      this.setDiagnostics(diagnostics);
    }

    return node;
  }

  setIsDeleted(isDeleted: boolean) {
    if (this.isDeleted === isDeleted) return;
    super.setIsDeleted(isDeleted);

    if (isDeleted) {
      this.story.removeGoal(this.goal);
    } else {
      this.story.addGoal(this.goal);
    }
  }
}
