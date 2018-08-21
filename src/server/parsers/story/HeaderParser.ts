import ParserBase from "./Parser";
import { Diagnostic } from "./models/diagnostics";
import { Token, TokenType } from "./Lexer";

import {
  HeaderGoalNode,
  NodeType,
  HeaderNode,
  DefinitionNode
} from "./models/nodes";
import msgUnexpectedToken from "./messages/msgUnexpectedToken";
import msgInvalidOptionName from "./messages/msgInvalidOptionName";
import msgInvalidGoalSection from "./messages/msgInvalidGoalSection";

function isAliasTypeToken(token: Token): boolean {
  return token.type === TokenType.Identifier && token.value === "alias_type";
}

function isConfigToken(token: Token): boolean {
  return (
    token.type === TokenType.Identifier &&
    (token.value === "option" || token.value === "version")
  );
}

function isGoalToken(token: Token): boolean {
  return token.type === TokenType.Identifier && token.value === "Goal";
}

function isDefinitionToken(token: Token): boolean {
  return (
    token.type === TokenType.Identifier &&
    (token.value === "call" ||
      token.value === "event" ||
      token.value === "query" ||
      token.value === "syscall" ||
      token.value === "sysquery")
  );
}

function range(source: string, start: number, end: number): string {
  if (!range) {
    return "";
  }

  const sourcePart = source.substring(start, end).trim();
  if (sourcePart === "") return "";

  const lines = sourcePart.split("\r\n");
  lines.push("");
  lines.unshift("");

  return lines
    .map(line => (line.startsWith("\t\t") ? line.substr(2) : line))
    .join("\r\n");
}

export interface ParserResult {
  diagnostics: Array<Diagnostic>;
  header: HeaderNode;
}

export default class HeaderParser extends ParserBase {
  parse(): ParserResult {
    let token: Token | null;
    const header: HeaderNode = {
      definitions: [],
      endOffset: 0,
      endPosition: 0,
      goals: [],
      startOffset: 0,
      startPosition: 0,
      type: NodeType.Div,
      typeAliases: []
    };

    while ((token = this.next())) {
      if (isAliasTypeToken(token)) {
        this.consumeAlias(header);
      } else if (isConfigToken(token)) {
        this.tryReadConstant();
      } else if (isDefinitionToken(token)) {
        const definition = this.readDefinition(token);
        if (definition) {
          header.definitions.push(definition);
        }
      } else if (isGoalToken(token)) {
        this.readGoal(header);
      }
    }

    return {
      diagnostics: this.diagnostics,
      header
    };
  }

  consumeAlias(header: HeaderNode) {
    if (!this.consume(TokenType.CurlyBracketOpen)) {
      return;
    }

    const type = this.read(TokenType.Identifier);
    if (type) {
      header.typeAliases.push(type.value);
    }

    this.consumeIncluding(TokenType.CurlyBracketClose);
  }

  readDefinition(token: Token): DefinitionNode | null {
    const startOffset = token.startOffset;
    const startPosition = token.startPosition;
    const definitionType = token.value;
    const signature = this.readSignature();

    if (!signature) return null;

    if (this.consume(TokenType.BracketOpen)) {
      this.consumeIncluding(TokenType.BracketClose);
    } else {
      this.addDiagnostic(
        null,
        msgUnexpectedToken({
          actualToken: this.last(),
          expectedHint: "definitionMetaData"
        })
      );
    }

    return {
      definitionType,
      endOffset: signature.endOffset,
      endPosition: signature.endPosition,
      signature,
      startOffset,
      startPosition,
      type: NodeType.Definition
    };
  }

  readGoal(header: HeaderNode): null {
    if (!this.consume(TokenType.BracketOpen)) {
      return null;
    }

    const idToken = this.read(TokenType.IntegerLiteral);
    if (!idToken) {
      this.consumeIncluding(TokenType.BracketClose);
      return null;
    }

    const id = parseInt(idToken.value);
    if (!this.consume(TokenType.BracketClose)) {
      return null;
    }

    let goal = header.goals.find(goal => goal.id === id);
    if (!goal) {
      goal = {
        endOffset: 0,
        endPosition: 0,
        exit: null,
        id,
        init: null,
        kb: null,
        startPosition: 0,
        startOffset: 0,
        subGoal: [],
        title: null,
        type: NodeType.DivGoal
      };
      header.goals.push(goal);
    }

    const separator = this.next();
    if (separator && separator.type === TokenType.Dot) {
      this.readGoalOption(goal);
    } else if (separator && separator.type === TokenType.CurlyBracketOpen) {
      this.readGoalContent(goal);
    }

    return null;
  }

  readGoalContent(goal: HeaderGoalNode) {
    let token: Token | null;

    while ((token = this.next())) {
      if (token.type === TokenType.CurlyBracketClose) {
        break;
      } else if (token.type === TokenType.Identifier) {
        const sectionName = token.value;

        token = this.read(TokenType.CurlyBracketOpen);
        if (!token) continue;

        const start = token.endOffset;
        while ((token = this.next())) {
          if (token.type === TokenType.CurlyBracketClose) {
            break;
          }
        }

        if (!token) continue;
        const data = range(this.source, start, token.startOffset);

        switch (sectionName) {
          case "INIT":
            goal.init = data;
            break;
          case "KB":
            goal.kb = data;
            break;
          case "EXIT":
            goal.exit = data;
            break;
          default:
            this.addDiagnostic(
              token,
              msgInvalidGoalSection({
                name: sectionName
              })
            );
        }
      } else {
        this.addDiagnostic(
          token,
          msgUnexpectedToken({
            actualToken: token
          })
        );
      }
    }
  }

  readGoalOption(goal: HeaderGoalNode) {
    const identifier = this.read(TokenType.Identifier);
    if (!identifier) {
      return this.consumeIncluding(TokenType.SemiColon);
    }

    const option = identifier.value;
    if (!this.consume(TokenType.BracketOpen)) {
      return this.consumeIncluding(TokenType.SemiColon);
    }

    if (option === "Title") {
      const title = this.read(TokenType.StringLiteral);
      if (title) {
        goal.title = title.value.substr(1, title.value.length - 2);
      }
    } else if (option === "SubGoal") {
      const subGoal = this.read(TokenType.IntegerLiteral);
      if (subGoal) {
        goal.subGoal.push(parseInt(subGoal.value));
      }
    } else if (option === "SubGoals") {
      this.next();
    } else {
      this.addDiagnostic(
        identifier,
        msgInvalidOptionName({
          name: option
        })
      );
    }

    if (!this.consume(TokenType.BracketClose)) {
      return this.consumeIncluding(TokenType.SemiColon);
    }

    this.ensureSemiColon();
  }
}
