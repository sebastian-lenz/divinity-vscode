import Goal from "../Goal";
import goalTemplate from "../../../../shared/goalTemplate";
import GoalParser from "../../../parsers/story/GoalParser";
import Resource, { ResourceOptions } from "./Resource";
import {
  HeaderGoalNode,
  StoryGoalNode
} from "../../../parsers/story/models/nodes";

export interface HeaderGoalResourceOptions extends ResourceOptions {
  name: string;
}

export default class HeaderGoalResource extends Resource<StoryGoalNode> {
  readonly goal: Goal;
  private source: string = "";

  constructor(options: HeaderGoalResourceOptions) {
    super(options);

    const { name, story } = options;
    const goal = new Goal(story, name, this);
    story.addGoal(goal);

    this.goal = goal;
  }

  dispose() {
    super.dispose();
    this.source = "";
    this.story.removeGoal(this.goal);
  }

  async getSource(): Promise<string> {
    return Promise.resolve(this.source);
  }

  getUri(): string {
    const { goal, story } = this;
    const { UUID } = story.project.meta;
    return `divinity:///${UUID}/${goal.name}.divGoal`;
  }

  update(allNodes: Array<HeaderGoalNode>, rootNode: HeaderGoalNode) {
    const id = rootNode.id;
    const parents: Array<string> = [];

    for (const { title, subGoal } of allNodes) {
      if (title && subGoal.some(subGoal => subGoal === id)) {
        parents.push(title);
      }
    }

    this.source = goalTemplate({
      exit: rootNode.exit,
      init: rootNode.init,
      kb: rootNode.kb,
      parents
    });

    const parser = new GoalParser(this.source);
    const { goal: node } = parser.parse();
    const { goal, story } = this;

    story.symbols.updateGoal(goal, node);
    goal.setParents(parents);
  }

  protected async parse(
    source: string,
    noAnalysis?: boolean
  ): Promise<StoryGoalNode> {
    const parser = new GoalParser(source);
    const { goal: node } = parser.parse();

    this.story.symbols.assignSymbols(node);

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
