import { TextDocumentEdit } from "vscode-languageserver";

import debounce from "../../utils/debounce";
import Feature from "../Feature";
import Goal from "../../projects/story/Goal";
import HeaderGoalResource from "../../projects/story/resources/HeaderGoalResource";
import Project from "../../projects/Project";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import unpackRange from "../../parsers/story/utils/unpackRange";
import { NodeType } from "../../parsers/story/models/nodes";

import {
  renameGoalRequest,
  RenameGoalParams,
  RenameGoalResult,
  moveGoalRequest,
  MoveGoalParams,
  MoveGoalResult
} from "../../../shared/requests";

import {
  goalsChangedEvent,
  GoalsChanged,
  GoalInfo
} from "../../../shared/notifications";

export default class StoryOutlineFeature extends Feature {
  treeVersion: number = 0;

  constructor(server: Server) {
    super(server);

    const { connection } = server;
    connection.onRequest(moveGoalRequest, (params: MoveGoalParams, token) =>
      runSafeAsync(
        () => this.handleMoveGoal(params),
        null,
        `Error while moving goal "${params.goalName}".`,
        token
      )
    );

    connection.onRequest(renameGoalRequest, (params: RenameGoalParams, token) =>
      runSafeAsync(
        () => this.handleRenameGoal(params),
        null,
        `Error while renaming goal "${params.goalName}".`,
        token
      )
    );

    server.projects.on("goalsChanged", this.handleGoalsChanged);
  }

  handleGoalsChanged = debounce((project: Project) => {
    const goals = this.createTree(project.story.getSortedRootGoals());
    const payload: GoalsChanged = {
      project: project.getInfo(),
      goals,
      treeVersion: this.treeVersion++
    };

    this.server.connection.sendNotification(goalsChangedEvent, payload);
  }, 50);

  async handleMoveGoal({
    goalName,
    newParent,
    projectUid
  }: MoveGoalParams): Promise<MoveGoalResult> {
    const project = this.server.projects.findProjectByUid(projectUid);
    if (!project) {
      return { error: `Could not find project with uid "${projectUid}".` };
    }

    const goal = project.story.findGoal(goalName);
    if (!goal) {
      return { error: `Could not find goal "${goalName}".` };
    }

    const rootNode = await goal.resource.getRootNode();
    if (
      !rootNode ||
      rootNode.type !== NodeType.StoryGoal ||
      !rootNode.parentTargetEdges
    ) {
      return { error: `Could not open goal "${goal.name}" for editing.` };
    }

    const documentChanges: Array<TextDocumentEdit> = [];
    const document = goal.resource.getDocument();
    documentChanges.push({
      textDocument: {
        uri: goal.resource.getUri(),
        version: document ? document.version : null
      },
      edits: [
        {
          newText: `"${newParent}"`,
          range: unpackRange(rootNode.parentTargetEdges[0])
        }
      ]
    });

    return { documentChanges };
  }

  async handleRenameGoal({
    goalName,
    newName,
    projectUid
  }: RenameGoalParams): Promise<RenameGoalResult> {
    const project = this.server.projects.findProjectByUid(projectUid);
    if (!project) {
      return { error: `Could not find project with uid "${projectUid}".` };
    }

    const goal = project.story.findGoal(goalName);
    if (!goal) {
      return { error: `Could not find goal "${goalName}".` };
    }

    const collision = project.story.findGoal(newName);
    if (collision) {
      return { error: `A goal with the name "${newName}" already exists.` };
    }

    const documentChanges: Array<TextDocumentEdit> = [];
    const children = goal.getChildren();

    for (const child of children) {
      if (child.resource instanceof HeaderGoalResource) {
        return {
          error: `A goal which contains subgoals from the shared mod cannot be renamed.`
        };
      }

      const rootNode = await child.resource.getRootNode();
      if (
        !rootNode ||
        rootNode.type !== NodeType.StoryGoal ||
        !rootNode.parentTargetEdges
      ) {
        return { error: `Could not open subgoal "${child.name}" for editing.` };
      }

      const edge = rootNode.parentTargetEdges.find(
        edge => edge.value === goalName
      );

      if (!edge) {
        return {
          error: `Could not locate parentTargetEdges pointing to "${goalName}" in "${
            child.name
          }".`
        };
      }

      const document = child.resource.getDocument();
      documentChanges.push({
        textDocument: {
          uri: child.resource.getUri(),
          version: document ? document.version : null
        },
        edits: [
          {
            newText: `"${newName}"`,
            range: unpackRange(edge)
          }
        ]
      });
    }

    return { documentChanges };
  }

  private createTree(
    goals: Array<Goal>,
    stack: Array<Goal> = []
  ): Array<GoalInfo> {
    return goals.filter(goal => stack.indexOf(goal) === -1).map(goal => ({
      children: this.createTree(goal.getSortedChildren(), [...stack, goal]),
      isShared: !goal.resource || goal.resource instanceof HeaderGoalResource,
      name: goal.name,
      uri: goal.resource.getUri()
    }));
  }
}
