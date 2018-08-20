import NodeAttribute from "./NodeAttribute";

export default class Node {
  attributes: { [name: string]: NodeAttribute } = {};
  children: { [name: string]: Array<Node> } = {};
  name: string = "";
  parent: Node | null = null;

  append(child: Node) {
    const { name } = child;
    let children = this.children[name];
    if (!children) {
      this.children[name] = children = [];
    }

    children.push(child);
  }

  findNode(name: string, ...path: string[]): Node | null {
    if (name in this.children) {
      const child = this.children[name][0];
      if (path.length) {
        const [childName, ...childPath] = path;
        return child.findNode(childName, ...childPath);
      } else {
        return child;
      }
    }

    return null;
  }

  getStringAttribute(name: string): string | null {
    const attribute = this.attributes[name];
    if (!attribute) return null;

    const value = attribute.value;
    return typeof value === "string" ? value : null;
  }
}
