import { normalize, join } from "path";

import Repository from "../raw/Repository";

const repositoryPath = normalize(join(process.cwd(), process.argv[2]));
const projectPath = normalize(process.argv[3]);

const repository = new Repository(repositoryPath);

console.log("");
repository.update(projectPath).then(() => {
  console.log("Done!");
  console.log("");
  process.exit();
});
