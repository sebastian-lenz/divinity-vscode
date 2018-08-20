import * as fs from "fs";
import { promisify } from "util";

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const rename = promisify(fs.rename);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

export { readDir, readFile, rename, stat, unlink, writeFile };
