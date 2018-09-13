import Resource from "./resources/Resource";
import sortGoals from "./utils/sortGoals";
import Story from ".";

export default class Goal {
  parents: Array<string> = [];
  weight: number = 0;
  readonly name: string;
  readonly resource: Resource;
  readonly story: Story;

  constructor(story: Story, name: string, resource: Resource) {
    this.resource = resource;
    this.name = name;
    this.story = story;
  }

  getChildren(): Array<Goal> {
    return this.story.getGoalsByParent(this.name);
  }

  getParents(): Array<Goal> {
    return this.parents.reduce((result, parent) => {
      const goal = this.story.getGoal(parent);
      if (goal) result.push(goal);
      return result;
    }, [] as Array<Goal>);
  }

  getPaths(): Array<string> {
    const parents = this.getParents();
    if (!parents.length) {
      return [this.name];
    }

    return parents.reduce((result, parent) => {
      const paths = parent.getPaths();
      for (const path of paths) {
        result.push(`${path}\\${this.name}`);
      }
      return result;
    }, [] as Array<string>);
  }

  getSortedChildren(): Array<Goal> {
    return this.story.getGoalsByParent(this.name).sort(sortGoals);
  }

  isHeaderGoal(): boolean {
    return this.resource.isHeaderGoal();
  }

  setParents(parents: Array<string>) {
    const { parents: oldParents } = this;
    parents.sort();

    if (
      oldParents.length === parents.length &&
      parents.every((parent, index) => parent === oldParents[index])
    ) {
      return;
    }

    this.parents = parents;
    this.story.updateTree();
  }

  setWeight(weight: number) {
    if (this.weight === weight) return;
    this.weight = weight;
    this.story.symbols.notifyGoalChanged(this);
  }

  static updateWeights(goals: Array<Goal>, weight: number = 0): number {
    for (const goal of goals) {
      goal.setWeight(weight++);
    }

    for (const goal of goals) {
      const children = goal.getChildren();
      if (children.length) {
        weight = this.updateWeights(children, weight);
      }
    }

    return weight;
  }
}
