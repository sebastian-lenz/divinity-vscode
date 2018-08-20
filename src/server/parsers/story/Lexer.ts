import msgNewLineInString from "./messages/msgNewLineInString";
import msgPrematureRealEnd from "./messages/msgPrematureRealEnd";
import packPosition from "./utils/packPosition";
import unpackRange from "./utils/unpackRange";

import {
  DiagnosticType,
  Diagnostic,
  DiagnosticMessage
} from "./models/diagnostics";

const CHAR_TAB = 9;
const CHAR_NEWLINE = 10;
const CHAR_CARRIAGE_RETURN = 13;
const CHAR_SPACE = 32;
const CHAR_EXCLAMATION = 33;
const CHAR_QUOTE = 34;
const CHAR_BRACKET_OPEN = 40;
const CHAR_BRACKET_CLOSE = 41;
const CHAR_ASTERISK = 42;
const CHAR_PLUS = 43;
const CHAR_COLON = 44;
const CHAR_MINUS = 45;
const CHAR_DOT = 46;
const CHAR_SLASH = 47;
const CHAR_SEMICOLON = 59;
const CHAR_LOWER_THAN = 60;
const CHAR_EQUALS = 61;
const CHAR_GREATER_THAN = 62;
const CHAR_SQUARE_OPEN = 91;
const CHAR_SQUARE_CLOSE = 93;
const CHAR_UNDERSCORE = 95;
const CHAR_CURLY_OPEN = 123;
const CHAR_CURLY_CLOSE = 125;

const NUM_TOKENS = 5;

const GUID_REGEXP = /[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$/;

const VALUE_BUFFER: Buffer = Buffer.alloc(64 * 1024);

function isIdentifierChar(char: number): boolean {
  return (
    isIdentifierStartChar(char) || isNumericChar(char) || char === CHAR_MINUS
  );
}

function isIdentifierStartChar(char: number): boolean {
  return (
    (char >= 65 && char <= 90) ||
    (char >= 97 && char <= 122) ||
    char === CHAR_UNDERSCORE
  );
}

function isNumericChar(char: number): boolean {
  return char >= 48 && char <= 57;
}

function isOperantChar(char: number): boolean {
  return (
    char === CHAR_EXCLAMATION ||
    char === CHAR_LOWER_THAN ||
    char === CHAR_EQUALS ||
    char === CHAR_GREATER_THAN
  );
}

function extractComment(value: string, type: TokenType): string {
  while (value.startsWith("/")) {
    value = value.substr(1);
  }

  if (type === TokenType.LineComment) {
    return value;
  }

  while (value.endsWith("/") || value.endsWith("*")) {
    value = value.substr(0, value.length - 1);
  }

  const lines = value.split(/\r\n|\r|\n/);
  for (let index = 0; index < lines.length; index++) {
    lines[index] = lines[index].replace(/^\s*\*+\s*/, "");
  }

  return lines.join("\n");
}

export const enum TokenType {
  Empty,
  EndOfFile,
  Invalid,

  // Common token types
  Annotation,
  BlockComment,
  BracketOpen,
  BracketClose,
  Colon,
  CurlyBracketOpen,
  CurlyBracketClose,
  Dot,
  GuidLiteral,
  FloatLiteral,
  Identifier,
  IntegerLiteral,
  LineComment,
  Operator,
  SemiColon,
  StringLiteral,

  // Keyword tokens
  AndKeyword,
  EndExitSectionKeyword,
  ExitSectionKeyword,
  GoalCompletedKeyword,
  IfKeyword,
  InitSectionKeyword,
  KBSectionKeyword,
  NotKeyword,
  ProcKeyword,
  ThenKeyword,
  QueryKeyword
}

export type PackedPosition = number;

export interface TokenRange {
  endOffset: number;
  endPosition: PackedPosition;
  startOffset: number;
  startPosition: PackedPosition;
}

export interface Token extends TokenRange {
  comment: string | null;
  type: TokenType;
  value: string;
}

export default class Lexer {
  diagnostics: Array<Diagnostic> = [];
  source: string;
  character: number = -1;
  lastComment: string | null = null;
  line: number = 0;
  offset: number = 0;
  region: string | null = null;
  private tokenBuffer: Array<Token>;

  constructor(source: string) {
    const tokenBuffer: Array<Token> = [];
    this.source = source;
    this.tokenBuffer = tokenBuffer;

    for (let index = 0; index < NUM_TOKENS; index++) {
      tokenBuffer.push({
        comment: null,
        endOffset: 0,
        endPosition: 0,
        startOffset: 0,
        startPosition: 0,
        type: TokenType.Empty,
        value: ""
      });

      if (index < NUM_TOKENS - 1) {
        this.readNextToken(index);
      }
    }
  }

  addDiagnostic(
    range: TokenRange | undefined = undefined,
    message: DiagnosticMessage
  ) {
    range = range || this.last() || this.peak();

    if (range) {
      this.diagnostics.push({
        ...message,
        range: unpackRange(range),
        type: DiagnosticType.Syntax
      });
    }
  }

  last(): Token | undefined {
    const { tokenBuffer } = this;
    const result = tokenBuffer[NUM_TOKENS - 1];

    return result.type === TokenType.EndOfFile ||
      result.type === TokenType.Empty
      ? undefined
      : result;
  }

  next(): Token | undefined {
    const { tokenBuffer } = this;
    const result = tokenBuffer[0];
    if (result.type === TokenType.EndOfFile) {
      return undefined;
    }

    for (let index = 1; index < NUM_TOKENS; index++) {
      tokenBuffer[index - 1] = tokenBuffer[index];
    }

    tokenBuffer[NUM_TOKENS - 1] = result;

    do {
      this.readNextToken(NUM_TOKENS - 2);
    } while (
      tokenBuffer[NUM_TOKENS - 2].type === TokenType.LineComment ||
      tokenBuffer[NUM_TOKENS - 2].type === TokenType.BlockComment
    );

    return result;
  }

  peak(offset: number = 0): Token | undefined {
    if (offset > NUM_TOKENS - 2) {
      throw new Error("Invalid peak offset.");
    }

    const { tokenBuffer } = this;
    for (let index = 0; index <= offset; index++) {
      if (tokenBuffer[index].type === TokenType.EndOfFile) {
        return undefined;
      }
    }

    return tokenBuffer[offset];
  }

  tokenize() {
    const result: Array<Token> = [];
    let token: Token | undefined;
    while ((token = this.next())) {
      result.push({
        ...token,
        endOffset: token.endOffset,
        endPosition: token.endPosition,
        startOffset: token.startOffset,
        startPosition: token.startPosition
      });
    }

    return result;
  }

  private readNextToken(bufferIndex: number) {
    const { source } = this;
    const { length } = source;
    let { character, line, offset } = this;
    const value = VALUE_BUFFER;
    const token = this.tokenBuffer[bufferIndex];

    let char: number | undefined;
    let charLength: number | undefined;
    let isNewLine = false;
    let nextChar: number | undefined;
    let previousCharacter = character;
    let previousLine = line;
    let previousOffset = offset;
    let type: TokenType | undefined;
    let valueOffset = 0;

    while (offset < length) {
      previousCharacter = character;
      previousLine = line;
      previousOffset = offset;

      char = source.charCodeAt(offset);
      charLength = 1;

      isNewLine = false;
      offset += 1;
      character += 1;

      // Track line numbers
      if (char === CHAR_CARRIAGE_RETURN) {
        isNewLine = true;
        character = -1;
        line += 1;

        if (offset < length - 1) {
          nextChar = source.charCodeAt(offset);
          if (nextChar === CHAR_NEWLINE) {
            charLength += 1;
            offset += 1;
          }
        }
      }

      if (char === CHAR_NEWLINE) {
        isNewLine = true;
        character = -1;
        line += 1;
      }

      // Consume values of the current token
      if (type) {
        if (type === TokenType.Annotation) {
          // Annotations consume till `]`
          if (char === CHAR_SQUARE_CLOSE) {
            value[valueOffset++] = char;
            break;
          }
        } else if (type === TokenType.BlockComment) {
          // Block comments consume till `*/`
          if (
            char === CHAR_SLASH &&
            valueOffset > 1 &&
            value[valueOffset - 1] === CHAR_ASTERISK
          ) {
            value[valueOffset++] = char;
            break;
          }
        } else if (type === TokenType.LineComment) {
          // Line comments consume till new line
          if (isNewLine) {
            // YIELD LineComment
            break;
          }
        } else if (type === TokenType.StringLiteral) {
          // String literals consume till `"`
          if (char === CHAR_QUOTE) {
            value[valueOffset++] = char;
            break;
          }
        } else if (type === TokenType.FloatLiteral) {
          // Float literals consume till no more numbers are read
          if (!isNumericChar(char)) {
            character = previousCharacter;
            line = previousLine;
            offset = previousOffset;
            break;
          }
        } else if (type === TokenType.IntegerLiteral) {
          if (char === CHAR_DOT) {
            // If a dot is found, switch to float literal
            type = TokenType.FloatLiteral;
          } else if (char === CHAR_MINUS) {
            // A guid starting with only numbers
            type = TokenType.Identifier;
          } else if (!isNumericChar(char)) {
            // Integer literals consume till no more numbers are read
            character = previousCharacter;
            line = previousLine;
            offset = previousOffset;
            break;
          }
        } else if (type === TokenType.Identifier) {
          // Identifiers read all valid characters
          if (!isIdentifierChar(char)) {
            character = previousCharacter;
            line = previousLine;
            offset = previousOffset;
            break;
          }
        }

        value[valueOffset++] = char;
        continue;
      }

      // Just skip whitespace
      if (isNewLine || char === CHAR_SPACE || char === CHAR_TAB) {
        continue;
      }

      token.startOffset = offset - 1;
      token.startPosition = packPosition(line, character);

      // Single character tokens
      if (char === CHAR_BRACKET_OPEN) {
        type = TokenType.BracketOpen;
        break;
      } else if (char === CHAR_BRACKET_CLOSE) {
        type = TokenType.BracketClose;
        break;
      } else if (char === CHAR_CURLY_OPEN) {
        type = TokenType.CurlyBracketOpen;
        break;
      } else if (char === CHAR_CURLY_CLOSE) {
        type = TokenType.CurlyBracketClose;
        break;
      } else if (char === CHAR_COLON) {
        type = TokenType.Colon;
        break;
      } else if (char === CHAR_SEMICOLON) {
        type = TokenType.SemiColon;
        break;
      } else if (char === CHAR_DOT) {
        // Maybe start of float
        nextChar = source.charCodeAt(offset);
        if (isNumericChar(nextChar)) {
          value[valueOffset++] = char;
          value[valueOffset++] = nextChar;
          type = TokenType.FloatLiteral;
          offset += 1;
          character += 1;
        } else {
          type = TokenType.Dot;
          break;
        }
      } else if (char === CHAR_QUOTE) {
        value[valueOffset++] = char;
        type = TokenType.StringLiteral;
      } else if (char === CHAR_SQUARE_OPEN) {
        value[valueOffset++] = char;
        type = TokenType.Annotation;
      } else if (
        isNumericChar(char) ||
        char === CHAR_PLUS ||
        char === CHAR_MINUS
      ) {
        value[valueOffset++] = char;
        type = TokenType.IntegerLiteral;
      } else if (char === CHAR_SLASH) {
        nextChar = source.charCodeAt(offset);
        if (nextChar === CHAR_ASTERISK) {
          value[valueOffset++] = char;
          value[valueOffset++] = nextChar;
          type = TokenType.BlockComment;
          offset += 1;
          character += 1;
        } else if (nextChar === CHAR_SLASH) {
          value[valueOffset++] = char;
          value[valueOffset++] = nextChar;
          type = TokenType.LineComment;
          offset += 1;
          character += 1;
        }
      } else if (isOperantChar(char)) {
        nextChar = source.charCodeAt(offset);
        if (nextChar === CHAR_EQUALS) {
          value[valueOffset++] = char;
          value[valueOffset++] = nextChar;
          type = TokenType.Operator;
          offset += 1;
          character += 1;
          break;
        } else if (char === CHAR_GREATER_THAN || char === CHAR_LOWER_THAN) {
          value[valueOffset++] = char;
          type = TokenType.Operator;
          break;
        }
      } else if (isIdentifierStartChar(char)) {
        value[valueOffset++] = char;
        type = TokenType.Identifier;
      } else {
        type = TokenType.Invalid;
        break;
      }
    }

    this.character = character;
    this.line = line;
    this.offset = offset;

    const stringValue = value.toString("utf-8", 0, valueOffset);
    if (type === TokenType.Identifier) {
      if (stringValue === "AND") {
        type = TokenType.AndKeyword;
      } else if (stringValue === "ENDEXITSECTION") {
        type = TokenType.EndExitSectionKeyword;
      } else if (stringValue === "EXITSECTION") {
        type = TokenType.ExitSectionKeyword;
      } else if (stringValue === "GoalCompleted") {
        type = TokenType.GoalCompletedKeyword;
      } else if (stringValue === "IF") {
        type = TokenType.IfKeyword;
      } else if (stringValue === "INITSECTION") {
        type = TokenType.InitSectionKeyword;
      } else if (stringValue === "KBSECTION") {
        type = TokenType.KBSectionKeyword;
      } else if (stringValue === "NOT") {
        type = TokenType.NotKeyword;
      } else if (stringValue === "PROC") {
        type = TokenType.ProcKeyword;
      } else if (stringValue === "THEN") {
        type = TokenType.ThenKeyword;
      } else if (stringValue === "QRY") {
        type = TokenType.QueryKeyword;
      } else if (GUID_REGEXP.test(stringValue)) {
        type = TokenType.GuidLiteral;
      }
    }

    token.endOffset = offset;
    token.endPosition = packPosition(line, character + 1);
    token.type = type || TokenType.EndOfFile;
    token.value = stringValue;

    if (
      token.type === TokenType.LineComment &&
      stringValue.startsWith("//REGION")
    ) {
      this.region = stringValue.substr(8).trim();
    } else if (
      token.type === TokenType.LineComment &&
      stringValue.startsWith("//END_REGION")
    ) {
      this.region = null;
    } else if (
      token.type === TokenType.BlockComment ||
      token.type === TokenType.LineComment
    ) {
      this.lastComment = extractComment(stringValue, token.type);
    } else {
      token.comment = this.lastComment;
      this.lastComment = null;
    }

    if (token.type === TokenType.FloatLiteral && token.value.endsWith(".")) {
      this.addDiagnostic(token, msgPrematureRealEnd());
    }

    if (token.type === TokenType.StringLiteral && /[\r\n]/.test(token.value)) {
      this.addDiagnostic(token, msgNewLineInString());
    }
  }
}
