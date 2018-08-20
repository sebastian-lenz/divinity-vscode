import eachNode from "./eachNode";
import { AnyNode } from "../models/nodes";

export interface NodeWithStack {
  node: AnyNode;
  stack: Array<AnyNode>;
}

export default function* eachNodeRecursive(
  parent?: AnyNode,
  stack: Array<AnyNode> = []
): Iterable<NodeWithStack> {
  for (const node of eachNode(parent)) {
    yield { node, stack };
    yield* eachNodeRecursive(node, [...stack, node]);
  }
}
