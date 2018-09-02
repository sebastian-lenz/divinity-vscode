import { parse } from "fast-xml-parser";
import { readFileSync } from "fs";

export default function readXmlFile<T = any>(path: string): T | null {
  try {
    const source = readFileSync(path, { encoding: "utf-8" });
    return parse(source, {
      attributeNamePrefix: "",
      attrNodeName: "$",
      ignoreAttributes: false
    }) as T;
  } catch (error) {
    return null;
  }
}
