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

    this.setDiagnostics(DiagnosticType.Syntax, diagnostics);
    story.symbols.updateGoal(goal, node);

    const parents = node.parentTargetEdges;
    goal.setParents(parents ? parents.map(parentEdge => parentEdge.value) : []);
    story.symbols.update();

    if (!story.isInitializing) {
      this.setDiagnostics(
        DiagnosticType.Analyzer,
        await story.analyzers.apply(this, node)
      );
    }

    return node;
  }
}
