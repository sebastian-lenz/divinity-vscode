import {
  ServerCapabilities,
  RenameParams,
  WorkspaceEdit,
  ResponseError,
  TextDocumentEdit
} from "vscode-languageserver";

import GoalResource from "../../projects/story/resources/GoalResource";
import eachNodeRecursive from "../../parsers/story/utils/eachNodeRecursive";
import Feature from "../Feature";
import Resource from "../../projects/story/resources/Resource";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import unpackRange from "../../parsers/story/utils/unpackRange";

import {
  NodeType,
  GuidLiteralNode,
  IdentifierType,
  IdentifierNode,
  AnyNode
} from "../../parsers/story/models/nodes";

import isCallerNode, {
  CallerNode
} from "../../parsers/story/utils/isCallerNode";

const GUID_VALIDATION = /^[A-Za-z0-9_-]*?[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$/;
const SIGNATURE_VALIDATION = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const VARIABLE_VALIDATION = /^_[A-Za-z0-9_-]*$/;

export interface Context {
  newName: string;
  nodes: Array<AnyNode>;
  resource: Resource;
}

export default class RenameFeature extends Feature {
  constructor(server: Server) {
    super(server);

    server.connection.onRenameRequest((params, token) =>
      runSafeAsync(
        () => this.handleRename(params),
        null,
        `Error while computing rename for ${params.textDocument.uri}`,
        token
      )
    );
  }

  getCapabilities(): Partial<ServerCapabilities> {
    return {
      renameProvider: true
    };
  }

  async renameGuid(
    identifier: GuidLiteralNode,
    { newName, resource }: Context
  ): Promise<WorkspaceEdit | ResponseError<any>> {
    const documentChanges: Array<TextDocumentEdit> = [];
    const { guid } = identifier;

    if (!GUID_VALIDATION.test(newName)) {
      return new ResponseError(-1, "The entered guid is invalid.");
    }

    for (const goal of resource.story.getGoals()) {
      if (!(goal.resource instanceof GoalResource)) {
        continue;
      }

      const rootNode = await goal.resource.getRootNode(true);
      let change: TextDocumentEdit | undefined;

      for (const { node } of eachNodeRecursive(rootNode)) {
        if (node.type !== NodeType.GuidLiteral || node.guid !== guid) {
          continue;
        }

        if (!change) {
          change = goal.resource.getTextEdit();
          documentChanges.push(change);
        }

        change.edits.push({
          newText: newName,
          range: unpackRange(node)
        });
      }
    }

    return { documentChanges };
  }

  async renameSignature(
    origin: CallerNode,
    { newName }: Context
  ): Promise<WorkspaceEdit | ResponseError<any>> {
    const { symbol } = origin;

    if (!symbol) {
      return new ResponseError(-1, "Cannot rename unresolved signatures.");
    }

    if (symbol.isSystem) {
      return new ResponseError(-1, "Cannot rename system signatures.");
    }

    if (!SIGNATURE_VALIDATION.test(newName)) {
      return new ResponseError(-1, "The entered name is invalid.");
    }

    const documentChanges: Array<TextDocumentEdit> = [];

    for (let index = 0; index < symbol.usages.length; index++) {
      const resource: GoalResource = symbol.usages[index]
        .resource as GoalResource;
      if (!(resource instanceof GoalResource)) {
        return new ResponseError(
          -1,
          "Cannot rename signatures from the shared mod."
        );
      }

      const rootNode = await resource.getRootNode(true);
      let change: TextDocumentEdit | undefined;

      for (const { node } of eachNodeRecursive(rootNode)) {
        if (!isCallerNode(node) || node.symbol !== symbol) {
          continue;
        }

        if (!change) {
          change = resource.getTextEdit();
          documentChanges.push(change);
        }

        change.edits.push({
          newText: newName,
          range: unpackRange(node.signature.identifier)
        });
      }
    }

    return { documentChanges };
  }

  async renameVariable(
    origin: IdentifierNode,
    { nodes, newName, resource }: Context
  ): Promise<WorkspaceEdit | ResponseError<any>> {
    const rule = nodes.find(node => node.type === NodeType.Rule);
    if (!rule) {
      return new ResponseError(
        -1,
        "Only variables inside rules can be renamed."
      );
    }

    if (!VARIABLE_VALIDATION.test(newName)) {
      return new ResponseError(-1, "The entered variable name is invalid.");
    }

    const changes = resource.getTextEdit();
    const name = origin.name.toLowerCase();

    for (const { node } of eachNodeRecursive(rule)) {
      if (
        node.type === NodeType.Identifier &&
        node.identifierType === IdentifierType.Variable &&
        node.name.toLowerCase() === name
      ) {
        changes.edits.push({ newText: newName, range: unpackRange(node) });
      }
    }

    return { documentChanges: [changes] };
  }

  async handleRename(
    params: RenameParams
  ): Promise<WorkspaceEdit | ResponseError<any>> {
    const { nodes, resource } = await this.getNodesAt(params);
    if (!nodes || !resource) {
      return new ResponseError(
        -1,
        "Could not resolve an symbols at the given location."
      );
    }

    const context = {
      newName: params.newName,
      nodes,
      resource
    };

    for (let index = 0; index < nodes.length; index++) {
      const origin = nodes[index];
      const caller = nodes[index + 2];

      if (origin.type === NodeType.GuidLiteral) {
        return await this.renameGuid(origin, context);
      } else if (
        origin.type === NodeType.Identifier &&
        origin.identifierType === IdentifierType.Variable
      ) {
        return await this.renameVariable(origin, context);
      } else if (
        caller &&
        isCallerNode(caller) &&
        origin === caller.signature.identifier
      ) {
        return await this.renameSignature(caller, context);
      }
    }

    return new ResponseError(-1, "This symbol cannot be renamed.");
  }
}
