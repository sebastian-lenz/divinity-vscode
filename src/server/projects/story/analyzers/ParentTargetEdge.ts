import GoalResource from "../resources/GoalResource";
import msgUnresolvedGoal from "../messages/msgUnresolvedGoal";
import { AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { NodeType } from "../../../parsers/story/models/nodes";

export default class ParentTargetEdgeAnalyzer extends SyncAnalyzer {
  analyze({ node, resource }: AnalyzerContext): boolean {
    if (
      node.type !== NodeType.ParentTragetEdge ||
      !(resource instanceof GoalResource)
    ) {
      return false;
    }

    const goal = resource.story.findGoal(node.name.value);
    if (!goal) {
      this.addDiagnostic(
        node,
        msgUnresolvedGoal({
          currentGoal: resource.goal.name,
          parentGoal: node.name.value
        })
      );
    }

    return false;
  }
}
