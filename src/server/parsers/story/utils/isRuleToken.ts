import { Token, TokenType } from "../Lexer";

export interface RuleToken extends Token {
  type: TokenType.IfKeyword | TokenType.ProcKeyword | TokenType.QueryKeyword;
}

export const ruleTokenTypes = [
  TokenType.IfKeyword,
  TokenType.ProcKeyword,
  TokenType.QueryKeyword
];

export default function isRuleToken(token: Token): token is RuleToken {
  return (
    token.type === TokenType.IfKeyword ||
    token.type === TokenType.ProcKeyword ||
    token.type === TokenType.QueryKeyword
  );
}
