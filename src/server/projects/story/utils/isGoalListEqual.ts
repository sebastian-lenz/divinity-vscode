import Goal from "../Goal";

function getGoalSort(left: Goal, right: Goal): number {
  return left.name.localeCompare(right.name);
}

export default function isGoalListEqual(
  left: Array<Goal> | null | undefined,
  right: Array<Goal> | null | undefined
): boolean {
  if (!left && !right) return true;
  if (!left || !right || left.length !== right.length) return false;

  left.sort(getGoalSort);
  right.sort(getGoalSort);

  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}
