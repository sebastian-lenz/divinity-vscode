import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../../../parsers/story/models/diagnostics";

export type Params = {
  currentGoal: string;
  parentGoal: string;
};

export default function msgUnresolvedGoal({
  currentGoal,
  parentGoal
}: Params): DiagnosticMessage {
  return {
    code: DiagnosticCode.UnresolvedGoal,
    message: `Parent goal of "${currentGoal}" could not be resolved: "${parentGoal}"`,
    severity: DiagnosticSeverity.Error
  };
}
