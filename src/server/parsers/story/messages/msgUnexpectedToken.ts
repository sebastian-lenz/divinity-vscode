import printTokenType from "../utils/printTokenType";
import { Token, TokenType } from "../Lexer";
import {
  DiagnosticCode,
  DiagnosticMessage,
  DiagnosticSeverity
} from "../models/diagnostics";

const hints = {
  definitionMetaData: "definition meta data.",
  parameter: "a parameter name or constant",
  parameterBlock: "a colon or closing bracket for parameters",
  parameterBlockStart: `a parameter name, constant or closing bracket ")"`,
  signature: "the name of a siganture",
  signatureOrThis: "the name of a siganture or a this value",
  storyBoundary: "a story boundary token",
  typeIdentifier: " a type identifier"
};

export type UnexpectedTokenHint = keyof typeof hints;

export type Params = {
  actualToken?: Token | TokenType;
  expectedHint?: UnexpectedTokenHint;
  expectedToken?: TokenType | Array<TokenType>;
};

export default function msgUnexpectedToken({
  actualToken,
  expectedHint,
  expectedToken
}: Params): DiagnosticMessage {
  let message = "Unexpected token";
  if (actualToken) message += `"${printTokenType(actualToken)}"`;

  if (expectedHint) {
    message += `, expected ${hints[expectedHint]}`;
  } else if (Array.isArray(expectedToken)) {
    const args = expectedToken.map(token => `"${printTokenType(token)}"`);
    const orArg = args.length > 1 ? ` or ${args.pop()}` : "";
    message += `, expected ${args.join(",")}${orArg}`;
  } else if (expectedToken) {
    message += `, expected "${printTokenType(expectedToken)}"`;
  }

  return {
    code: DiagnosticCode.UnexpectedToken,
    message,
    severity: DiagnosticSeverity.Error
  };
}
