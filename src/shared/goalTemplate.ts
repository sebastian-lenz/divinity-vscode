export interface TemplateOptions {
  exit?: string | null;
  init?: string | null;
  kb?: string | null;
  parents?: Array<string>;
  subGoalCombiner?: string;
  version?: number;
}

export default function goalTemplate({
  exit = "",
  init = "",
  kb = "",
  parents = [],
  subGoalCombiner = "SGC_AND",
  version = 1
}: TemplateOptions): string {
  const lines = [
    `Version ${version}`,
    `SubGoalCombiner ${subGoalCombiner}`,
    "INITSECTION",
    init,
    "KBSECTION",
    kb,
    "EXITSECTION",
    exit,
    "ENDEXITSECTION"
  ];

  for (const parent of parents) {
    lines.push(`ParentTargetEdge "${parent}"`);
  }

  return lines.join("\r\n");
}
