import { parseString } from "xml2js";
import { readFile } from "../../shared/fs";

export default async function readXmlFile<T = any>(path: string): Promise<T> {
  return readFile(path, { encoding: "utf-8" }).then(
    source =>
      new Promise<T>((resolve, reject) => {
        parseString(source, (error, data) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        });
      })
  );
}
