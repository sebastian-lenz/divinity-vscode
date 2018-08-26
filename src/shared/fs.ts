import * as fs from "fs";
import { promisify } from "util";

const close = promisify(fs.close);
const exists = promisify(fs.exists);
const open = promisify(fs.open);
const read = promisify(fs.read);
const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const rename = promisify(fs.rename);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

export {
  close,
  exists,
  open,
  read,
  readDir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile
};
