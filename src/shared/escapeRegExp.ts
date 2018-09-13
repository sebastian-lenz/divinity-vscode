const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

export default function escapeRegExp(value: string): string {
  return value.replace(matchOperatorsRe, "\\$&");
}

