import { Token, TokenType } from "../Lexer";

export const storyTokenTypes = [
  TokenType.InitSectionKeyword,
  TokenType.KBSectionKeyword,
  TokenType.ExitSectionKeyword,
  TokenType.EndExitSectionKeyword
];

export interface StoryToken extends Token {
  type:
    | TokenType.InitSectionKeyword
    | TokenType.KBSectionKeyword
    | TokenType.ExitSectionKeyword
    | TokenType.EndExitSectionKeyword;
}

export default function isStoryToken(token: Token): token is StoryToken {
  return (
    token.type === TokenType.InitSectionKeyword ||
    token.type === TokenType.KBSectionKeyword ||
    token.type === TokenType.ExitSectionKeyword ||
    token.type === TokenType.EndExitSectionKeyword
  );
}
