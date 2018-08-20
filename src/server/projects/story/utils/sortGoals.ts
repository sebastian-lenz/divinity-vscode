import Goal from "../Goal";

export default function sortGoals(left: Goal, right: Goal): number {
  return left.name.localeCompare(right.name);
}
