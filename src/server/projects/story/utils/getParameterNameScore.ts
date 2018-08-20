export default function getParameterNameScoe(value: string): number {
  if (value.startsWith("_Param")) {
    return 0;
  }

  return Math.abs(value.length);
}
