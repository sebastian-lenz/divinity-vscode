import { Hover } from "vscode-languageserver";

import HoverFeature from "./index";
import Resource from "../../projects/story/resources/Resource";
import { AnyNode } from "../../parsers/story/models/nodes";

export type AnyProvider = AsyncProvider | SyncProvider;

export interface ProviderContext {
  index: number;
  node: AnyNode;
  nodes: Array<AnyNode>;
  resource: Resource;
}

export abstract class Provider {
  feature: HoverFeature;

  constructor(feature: HoverFeature) {
    this.feature = feature;
  }
}

export abstract class AsyncProvider<T = {}> extends Provider {
  abstract canHandle(context: ProviderContext): T | null;

  abstract async invoke(data: T): Promise<Hover | null>;
}

export abstract class SyncProvider extends Provider {
  abstract invoke(context: ProviderContext): Hover | null;
}
