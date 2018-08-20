import { join, normalize } from "path";

export default function getPackagePath() {
  return normalize(join(__dirname, "..", ".."));
}
