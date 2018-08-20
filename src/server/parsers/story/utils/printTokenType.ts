import { TokenType, Token } from "../Lexer";

export default function printTokenType(
  type: Token | TokenType | undefined
): string {
  if (!type) {
    return "<nothing>";
  }

  if (typeof type === "object") {
    type = type.type;
  }

  switch (type) {
    case TokenType.Empty:
      return "<nothing>";
    case TokenType.EndOfFile:
      return "<end of file>";
    case TokenType.Invalid:
      return "<invalid token>";

    // Common token types
    case TokenType.Annotation:
      return "annotion, e.g. '[in]'";
    case TokenType.BlockComment:
      return "block comment";
    case TokenType.BracketOpen:
      return "opening bracket `(`";
    case TokenType.BracketClose:
      return "closing bracket `)`";
    case TokenType.Colon:
      return "colon `,`";
    case TokenType.CurlyBracketOpen:
      return "opening curly bracket `{`";
    case TokenType.CurlyBracketClose:
      return "closing curly bracket `}`";
    case TokenType.Dot:
      return "dot `.`";
    case TokenType.GuidLiteral:
      return "guid literal";
    case TokenType.FloatLiteral:
      return "float literal";
    case TokenType.Identifier:
      return "identifier";
    case TokenType.IntegerLiteral:
      return "integer literal";
    case TokenType.LineComment:
      return "line comment";
    case TokenType.Operator:
      return "operator `==`, `!=`, `<=`, `>=`, `>` or `<`";
    case TokenType.SemiColon:
      return "semicolon `;`";
    case TokenType.StringLiteral:
      return "string literal";

    // Keyword tokens
    case TokenType.AndKeyword:
      return "AND";
    case TokenType.EndExitSectionKeyword:
      return "ENDEXITSECTION";
    case TokenType.ExitSectionKeyword:
      return "EXITSECTION";
    case TokenType.GoalCompletedKeyword:
      return "GoalCompleted";
    case TokenType.IfKeyword:
      return "IF";
    case TokenType.InitSectionKeyword:
      return "INITSECTION";
    case TokenType.KBSectionKeyword:
      return "KBSECTION";
    case TokenType.NotKeyword:
      return "NOT";
    case TokenType.ProcKeyword:
      return "PROC";
    case TokenType.ThenKeyword:
      return "THEN";
    case TokenType.QueryKeyword:
      return "QRY";
  }
}
