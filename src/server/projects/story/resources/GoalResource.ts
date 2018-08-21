import { basename } from "path";

import GoalParser from "../../../parsers/story/GoalParser";
import { DiagnosticType } from "../../../parsers/story/models/diagnostics";
import { StoryGoalNode } from "../../../parsers/story/models/nodes";

import FileResource, { FileResourceOptions } from "./FileResource";
import Goal from "../Goal";
import Story from "..";

export default class GoalResource extends FileResource<StoryGoalNode> {
  readonly goal: Goal;
  readonly story: Story;

  constructor(options: FileResourceOptions) {
    super(options);

    const { path, story } = options;
    const goal = new Goal(story, basename(path, ".txt"), this);
    story.addIgnoredGoal(goal.name);
    story.addGoal(goal);

    this.goal = goal;
    this.story = story;
  }

  async analyze() {
    const node = await this.getRootNode(true);

    this.setDiagnostics(
      DiagnosticType.Analyzer,
      await this.story.analyzers.apply(this, node)
    );
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

  protected async parse(
    source: string,
    noAnalysis?: boolean
  ): Promise<StoryGoalNode> {
    const { goal, story } = this;
    const parser = new GoalParser(source);
    const { diagnostics, goal: node } = parser.parse();

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

    if (!story.isInitializing) {
      // Set the parser errors silently so analyzers can see them
      this.diagnostics = diagnostics;
      this.setAllDiagnostics([
        ...diagnostics,
        ...(await story.analyzers.apply(this, node))
      ]);
    } else {
      this.setDiagnostics(DiagnosticType.Syntax, diagnostics);
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
