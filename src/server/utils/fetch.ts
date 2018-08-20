import * as https from "https";

export interface FetchResult {
  code: number;
  content: string;
  error?: Error;
}

export default function fetch(url: string): Promise<FetchResult> {
  return new Promise<FetchResult>(resolve => {
    https
      .get(url, resp => {
        let content = "";

        resp.on("data", chunk => {
          content += chunk;
        });

        resp.on("end", () => {
          resolve({
            code: resp.statusCode || -1,
            content
          });
        });
      })
      .on("error", error => {
        resolve({ code: -1, content: "", error });
      });
  });
}
