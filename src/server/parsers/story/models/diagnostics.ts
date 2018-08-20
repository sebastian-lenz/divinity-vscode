import { DiagnosticSeverity } from "vscode-languageserver";
import { TokenRange } from "../Lexer";

export { DiagnosticSeverity };

export interface DiagnosticMessage {
  code: DiagnosticCode;
  message: string;
  severity: DiagnosticSeverity;
}

export enum DiagnosticType {
  Analyzer,
  Syntax
}

export interface Diagnostic extends DiagnosticMessage, TokenRange {
  type: DiagnosticType;
}

/**
 * Keep in sync with
 * https://github.com/Norbyte/lslib/blob/master/LSLib/LS/Story/Compiler/Compiler.cs#L159
 */
export const enum DiagnosticCode {
  // Miscellaenous internal error - should not happen.
  InternalError = "E00",

  // A type ID was declared multiple times in the story definition file.
  TypeIdAlreadyDefined = "E01",

  // A type name (alias)  was declared multiple times in the story definition file.
  TypeNameAlreadyDefined = "E02",

  // The type ID is either an intrinsic ID or is outside the allowed range.
  TypeIdInvalid = "E03",

  // The alias type ID doesn't point to a valid intrinsic type ID
  IntrinsicTypeIdInvalid = "E04",

  // A function with the same signature already exists.
  SignatureAlreadyDefined = "E05",

  // The type of an argument could not be resolved in a builtin function.
  // (This only occurs when parsing story headers, not in goal code)
  UnresolvedTypeInSignature = "E06",

  // A goal with the same name was seen earlier.
  GoalAlreadyDefined = "E07",

  // The parent goal specified in the goal script was not found.
  UnresolvedGoal = "E08",

  // Failed to infer the type of a rule-local variable.
  UnresolvedVariableType = "E09",

  // The function signature (full typed parameter list) of a function
  // could not be determined. This is likely the result of a failed type inference.
  UnresolvedSignature = "E10",

  // The intrinsic type of a function parameter does not match the expected type.
  LocalTypeMismatch = "E11",

  // Constant value with unknown type encountered during IR generation.
  UnresolvedType = "E12",

  // PROC/QRY declarations must start with a PROC/QRY name as the first condition.
  InvalidProcDefinition = "E13",

  // Fact contains a function that is not callable
  // (the function is not a call, database or proc).
  InvalidSymbolInFact = "E14",

  // Rule action contains a function that is not callable
  // (the function is not a call, database or proc).
  InvalidSymbolInStatement = "E15",

  // "NOT" action contains a non-database function.
  CanOnlyDeleteFromDatabase = "E16",

  // Initial PROC/QRY/IF function type differs from allowed type.
  InvalidSymbolInInitialCondition = "E17",

  // Condition contains a function that is not a query or database.
  InvalidFunctionTypeInCondition = "E18",

  // Function name could not be resolved.
  UnresolvedSymbol = "E19",

  // Use of less/greater operators on strings or guidstrings.
  StringLtGtComparison = "W20",

  // The alias type of a function parameter does not match the expected type.
  GuidAliasMismatch = "W21",

  // Object name GUID is prefixed with a type that is not known.
  GuidPrefixNotKnown = "W22",

  // PROC_/QRY_ naming style violation.
  RuleNamingStyle = "W23",

  // A rule variable was used in a read context, but was not yet bound.
  ParamNotBound = "E24",

  // The database is likely unused or unpopulated.
  // (Written but not read, or vice versa)
  UnusedDatabase = "W25",

  // Database "DB_" naming convention violation.
  DbNamingStyle = "W26",

  // Object name GUID could not be resolved to a game object.
  UnresolvedGameObjectName = "W27",

  // Type of name GUID differs from type of game object.
  GameObjectTypeMismatch = "W28",

  // Name part of name GUID differs from name of game object.
  GameObjectNameMismatch = "W29",

  // Multiple definitions seen for the same function with different signatures.
  ProcTypeMismatch = "E30",

  // Custom
  // ---------------------------------
  InvalidToken = "E1000",
  PrematureRealEnd = "E1001",
  NewLineInString = "E1002",
  UnexpectedToken = "E1003",
  EmptyRuleBody = "E1004",
  InvalidOptionName = "E1005",
  InvalidOptionValue = "E1006",
  InvalidOptionLocation = "E1007",
  InvalidGoalSection = "E1008",
  InvalidVariableName = "E1009",
  VariableNotAllowed = "E1010"
}
