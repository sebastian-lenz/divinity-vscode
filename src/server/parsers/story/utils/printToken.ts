import { Token, TokenType } from "../Lexer";

export default function printToken(token?: Token | undefined): string {
  if (!token) {
    return "<no token>";
  }

  switch (token.type) {
    case TokenType.IfKeyword:
      return "IF";
    case TokenType.ProcKeyword:
      return "PROC";
    case TokenType.QueryKeyword:
      return "QRY";
    case TokenType.StringLiteral:
      return `"${token.value}"`;
    case TokenType.Identifier:
      return token.value;
    default:
      return "";
  }
}
