import isRuleToken, { ruleTokenTypes } from "./utils/isRuleToken";
import isStoryToken, { StoryToken } from "./utils/isStoryToken";
import Lexer, { TokenType, Token, TokenRange } from "./Lexer";
import msgEmptyRuleBody from "./messages/msgEmptyRuleBody";
import { ActionNode } from "./utils/isActionNode";
import { ArgumentNode } from "./utils/isArgumentNode";
import { ConditionNode } from "./utils/isConditionNode";

import msgUnexpectedToken, {
  UnexpectedTokenHint
} from "./messages/msgUnexpectedToken";

import {
  ActionBlockNode,
  ConditionBlockNode,
  NodeType,
  OperatorNode,
  ParameterNode,
  RuleNode,
  SignatureNode,
  TypeAnnotationNode,
  RuleBlockNode,
  SignatureCallNode,
  AbstractNode,
  ParameterFlow,
  IdentifierNode,
  StringLiteralNode,
  NumericLiteralNode,
  GuidLiteralNode,
  IdentifierType,
  GoalCompletedNode
} from "./models/nodes";

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type WithoutRange<T extends TokenRange> = Omit<
  T,
  "endOffset" | "endPosition" | "startOffset" | "startPosition"
>;

const GUID_REGEXP = /(.*?)([0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12})$/;

export default class Parser extends Lexer {
  bailOutTypes: Array<TokenType> = [];

  consume(type: TokenType): boolean {
    const token = this.peak();
    if (token && token.type === type) {
      this.next();
      return true;
    }

    this.addDiagnostic(
      token,
      msgUnexpectedToken({
        actualToken: token,
        expectedToken: type
      })
    );

    return false;
  }

  consumeUntil(...types: Array<TokenType>): boolean {
    const { bailOutTypes } = this;

    let token: Token | null;
    while ((token = this.peak())) {
      if (bailOutTypes.indexOf(token.type) !== -1) {
        return false;
      }

      if (types.indexOf(token.type) !== -1) {
        return true;
      }

      this.next();
    }

    return false;
  }

  consumeIncluding(...types: Array<TokenType>): boolean {
    const result = this.consumeUntil(...types);
    if (result) {
      this.next();
    }

    return result;
  }

  ensureSemiColon(lastToken: Token | null = null) {
    const nextToken = this.peak();

    if (nextToken && nextToken.type === TokenType.SemiColon) {
      this.next();
    } else {
      this.addDiagnostic(
        lastToken,
        msgUnexpectedToken({
          actualToken: nextToken,
          expectedToken: TokenType.SemiColon
        })
      );
    }
  }

  injectRange<T extends AbstractNode>(callback: {
    (): WithoutRange<T> | null;
  }): { (): T | null } {
    return () => {
      const first = this.peak();
      if (!first) {
        return null;
      }

      const startOffset = first.startOffset;
      const startPosition = first.startPosition;
      const result = callback() as T;

      if (result) {
        const last = this.last();
        if (!last) {
          return null;
        }

        result.endOffset = last.endOffset;
        result.endPosition = last.endPosition;
        result.startOffset = startOffset;
        result.startPosition = startPosition;
      }

      return result;
    };
  }

  isBailOutToken(token: Token): boolean {
    return this.bailOutTypes.indexOf(token.type) !== -1;
  }

  read(
    type: TokenType | Array<TokenType>,
    error?: boolean,
    hint?: UnexpectedTokenHint
  ): Token | null {
    const token = this.peak();
    if (
      token &&
      (Array.isArray(type)
        ? type.indexOf(token.type) !== -1
        : token.type === type)
    ) {
      this.next();
      return token;
    }

    if (error) {
      this.addDiagnostic(
        token,
        msgUnexpectedToken({
          actualToken: token,
          expectedHint: hint,
          expectedToken: type
        })
      );
    }

    return null;
  }

  readAction(): ActionNode | null {
    const token = this.peak();
    if (!token) return null;
    if (token.type == TokenType.GoalCompletedKeyword) {
      const result: GoalCompletedNode = {
        endOffset: token.endOffset,
        endPosition: token.endPosition,
        startOffset: token.startOffset,
        startPosition: token.startPosition,
        type: NodeType.GoalCompletedAction
      };

      this.next();
      this.ensureSemiColon(token);
      return result;
    }

    const startOffset = token.startOffset;
    const startPosition = token.startPosition;
    let isInverted: boolean = false;

    if (token.type === TokenType.NotKeyword) {
      this.next();
      isInverted = true;
    }

    const signature = this.readSignature();
    if (!signature) {
      return null;
    }

    this.ensureSemiColon();
    return {
      endOffset: signature.endOffset,
      endPosition: signature.endPosition,
      isInverted,
      signature,
      startOffset,
      startPosition,
      symbol: null,
      type: NodeType.SignatureAction
    };
  }

  readActionBlock = this.injectRange<ActionBlockNode>(() => {
    const actions: Array<ActionNode> = [];
    let token: Token | null;
    let action;

    while ((token = this.peak())) {
      if (this.isBailOutToken(token)) {
        break;
      }

      action = this.readAction();
      if (action) {
        actions.push(action);
      } else if (this.consumeUntil(TokenType.SemiColon)) {
        this.next();
      } else {
        break;
      }
    }

    return {
      actions,
      type: NodeType.ActionBlock
    };
  });

  readCondition = this.injectRange<ConditionNode>(() => {
    const isInverted = this.tryReadNotToken();
    const maybeBracket = this.peak();
    const maybeOperator = this.peak(1);

    if (
      (maybeBracket && maybeBracket.type === TokenType.BracketOpen) ||
      (maybeOperator && maybeOperator.type === TokenType.Operator)
    ) {
      return this.readOperatorCondition(isInverted);
    } else {
      return this.readSignatureCondition(isInverted);
    }
  });

  readConditionBlock = this.injectRange<ConditionBlockNode>(() => {
    const conditions: Array<ConditionNode> = [];
    let token: Token | null;

    while ((token = this.peak())) {
      if (this.isBailOutToken(token) || token.type === TokenType.ThenKeyword) {
        break;
      } else if (token.type === TokenType.AndKeyword) {
        this.next();
        const condition = this.readCondition();
        if (condition) {
          conditions.push(condition);
        }
      } else {
        this.addDiagnostic(
          token,
          msgUnexpectedToken({
            actualToken: token,
            expectedToken: [TokenType.AndKeyword, TokenType.ThenKeyword]
          })
        );

        if (!this.consumeUntil(TokenType.AndKeyword, TokenType.ThenKeyword)) {
          break;
        }
      }
    }

    return {
      conditions,
      type: NodeType.ConditionBlock
    };
  });

  readFloatLiteral(): NumericLiteralNode | null {
    const token = this.read(TokenType.FloatLiteral);
    return token
      ? {
          endOffset: token.endOffset,
          endPosition: token.endPosition,
          startOffset: token.startOffset,
          startPosition: token.startPosition,
          type: NodeType.RealLiteral,
          value: parseFloat(token.value)
        }
      : null;
  }

  readGuidLiteral(): GuidLiteralNode | null {
    const token = this.read(TokenType.GuidLiteral);
    if (!token) {
      return null;
    }

    const match = GUID_REGEXP.exec(token.value);
    if (!match) {
      return null;
    }

    return {
      endOffset: token.endOffset,
      endPosition: token.endPosition,
      guid: match[2].toLowerCase(),
      prefix: match[1],
      startOffset: token.startOffset,
      startPosition: token.startPosition,
      type: NodeType.GuidLiteral
    };
  }

  readIdentifier(hint?: UnexpectedTokenHint): IdentifierNode | null {
    const token = this.read(TokenType.Identifier, true, hint);
    if (!token) return null;

    let identifierType: IdentifierType = IdentifierType.Default;
    if (token.value.startsWith("DB_")) {
      identifierType = IdentifierType.Database;
    } else if (token.value === "_") {
      identifierType = IdentifierType.Empty;
    } else if (token.value.startsWith("_")) {
      identifierType = IdentifierType.Variable;
    }

    return {
      endOffset: token.endOffset,
      endPosition: token.endPosition,
      startOffset: token.startOffset,
      startPosition: token.startPosition,
      identifierType,
      name: token.value,
      type: NodeType.Identifier
    };
  }

  readIntegerLiteral(): NumericLiteralNode | null {
    const token = this.read(TokenType.IntegerLiteral);
    return token
      ? {
          endOffset: token.endOffset,
          endPosition: token.endPosition,
          startOffset: token.startOffset,
          startPosition: token.startPosition,
          value: parseInt(token.value),
          type: NodeType.IntegerLiteral
        }
      : null;
  }

  readOperatorCondition(
    isInverted: boolean
  ): WithoutRange<OperatorNode> | null {
    const leftType = this.tryReadTypeAnnoation();
    const leftOperant = this.tryReadArgument();
    if (!leftOperant) return null;

    const operatorToken = this.read(TokenType.Operator, true);
    if (!operatorToken) return null;
    const operator = operatorToken.value;

    const rightType = this.tryReadTypeAnnoation();
    const rightOperant = this.tryReadArgument();
    if (!rightOperant) return null;

    if (leftOperant && operatorToken && rightOperant) {
      return {
        isInverted,
        leftOperant,
        leftType,
        operator,
        rightOperant,
        rightType,
        type: NodeType.OperatorCondition
      };
    }

    return null;
  }

  readParameter = this.injectRange<ParameterNode>(() => {
    const flow = this.tryReadParameterFlow();
    const valueType = this.tryReadTypeAnnoation();
    const argument = this.tryReadArgument();

    if (argument) {
      return {
        argument,
        flow,
        type: NodeType.Parameter,
        valueType
      };
    }

    this.addDiagnostic(
      argument,
      msgUnexpectedToken({
        actualToken: argument,
        expectedHint: "parameter"
      })
    );

    return null;
  });

  readParameters(thisParameter: IdentifierNode | null): Array<ParameterNode> {
    const result: Array<ParameterNode> = [];

    if (thisParameter) {
      result.push({
        endOffset: thisParameter.endOffset,
        endPosition: thisParameter.endPosition,
        flow: null,
        startOffset: thisParameter.startOffset,
        startPosition: thisParameter.startPosition,
        argument: thisParameter,
        type: NodeType.Parameter,
        valueType: null
      });
    }

    if (!this.consume(TokenType.BracketOpen)) {
      return result;
    }

    let token = this.peak();
    if (!token) {
      this.addDiagnostic(
        null,
        msgUnexpectedToken({
          expectedHint: "parameterBlockStart"
        })
      );
      return result;
    } else if (token.type === TokenType.BracketClose) {
      this.next();
      return result;
    }

    do {
      const parameter = this.readParameter();
      if (parameter) {
        result.push(parameter);
      } else if (!this.consumeUntil(TokenType.Colon, TokenType.BracketClose)) {
        return result;
      }

      token = this.peak();
      if (token && token.type === TokenType.Colon) {
        this.next();
      } else if (token && token.type === TokenType.BracketClose) {
        this.next();
        return result;
      } else {
        this.addDiagnostic(
          token,
          msgUnexpectedToken({
            actualToken: token,
            expectedHint: "parameterBlock"
          })
        );
        if (this.consumeUntil(TokenType.Colon, TokenType.BracketClose)) {
          continue;
        } else {
          return result;
        }
      }
    } while (token && (token = this.peak()));

    return result;
  }

  readRule = this.injectRange<RuleNode>(() => {
    const ruleTypeToken = this.read(ruleTokenTypes);
    if (!ruleTypeToken) return null;
    const comment = ruleTypeToken.comment;
    const region = this.getRegion();
    const ruleType = ruleTypeToken.value as any;

    const signature = this.readSignature();
    if (!signature) return null;

    const conditions = this.readConditionBlock();
    if (!conditions) return null;

    this.read(TokenType.ThenKeyword, true);

    const body = this.readActionBlock();
    if (!body) return null;
    if (body.actions.length === 0) {
      this.addDiagnostic(null, msgEmptyRuleBody());
    }

    return {
      body,
      comment,
      conditions,
      ruleType,
      region,
      signature,
      symbol: null,
      type: NodeType.Rule
    };
  });

  readRuleBlock = this.injectRange<RuleBlockNode>(() => {
    const rules: Array<RuleNode> = [];
    let token: Token | null;

    while ((token = this.peak())) {
      if (this.isBailOutToken(token)) {
        break;
      }

      let skip: boolean = false;
      if (isRuleToken(token)) {
        let rule;
        this.withBailOutTypes(
          [TokenType.IfKeyword, TokenType.ProcKeyword, TokenType.QueryKeyword],
          () => {
            rule = this.readRule();
          }
        );

        if (!rule) {
          skip = true;
        } else {
          rules.push(rule);
        }
      } else {
        skip = true;
        this.addDiagnostic(
          token,
          msgUnexpectedToken({
            actualToken: token,
            expectedToken: ruleTokenTypes
          })
        );
      }

      if (skip && !this.consumeUntil(...ruleTokenTypes)) {
        break;
      }
    }

    return {
      rules,
      type: NodeType.RuleBlock
    };
  });

  readSignature = this.injectRange<SignatureNode>(() => {
    let thisParamater: IdentifierNode | null = null;
    let identifier = this.readIdentifier("signature");
    if (!identifier) {
      return null;
    }

    const dotToken = this.peak();
    if (dotToken && dotToken.type === TokenType.Dot) {
      this.next();
      thisParamater = identifier;

      identifier = this.readIdentifier("signature");
      if (!identifier) return null;
    }

    const parameters = this.readParameters(thisParamater);

    return {
      identifier,
      parameters,
      type: NodeType.Signature
    };
  });

  readSignatureCondition(
    isInverted: boolean
  ): WithoutRange<SignatureCallNode> | null {
    const signature = this.readSignature();
    if (signature) {
      return {
        isInverted,
        signature,
        symbol: null,
        type: NodeType.SignatureCondition
      };
    }

    return null;
  }

  readStringLiteral(): StringLiteralNode | null {
    const token = this.read(TokenType.StringLiteral);
    return token
      ? {
          endOffset: token.endOffset,
          endPosition: token.endPosition,
          startOffset: token.startOffset,
          startPosition: token.startPosition,
          value: token.value.substr(1, token.value.length - 2),
          type: NodeType.StringLiteral
        }
      : null;
  }

  readStoryBoundary(): StoryToken | null {
    let token = this.next();
    if (token && isStoryToken(token)) {
      return token;
    }

    this.addDiagnostic(
      token,
      msgUnexpectedToken({
        actualToken: token,
        expectedHint: "storyBoundary"
      })
    );

    this.next();
    while ((token = this.next())) {
      if (isStoryToken(token)) return token;
    }

    return null;
  }

  tryReadArgument(): ArgumentNode | null {
    const token = this.peak();
    if (!token) return null;

    return token.type === TokenType.Identifier
      ? this.readIdentifier()
      : this.tryReadConstant();
  }

  tryReadConstant() {
    const token = this.peak();
    if (!token) return null;

    if (token.type === TokenType.FloatLiteral) {
      return this.readFloatLiteral();
    } else if (token.type === TokenType.GuidLiteral) {
      return this.readGuidLiteral();
    } else if (token.type === TokenType.IntegerLiteral) {
      return this.readIntegerLiteral();
    } else if (token.type === TokenType.StringLiteral) {
      return this.readStringLiteral();
    }

    return null;
  }

  tryReadNotToken(): boolean {
    const notToken = this.peak();
    if (notToken && notToken.type === TokenType.NotKeyword) {
      this.next();
      return true;
    }

    return false;
  }

  tryReadTypeAnnoation = this.injectRange<TypeAnnotationNode>(() => {
    if (!this.read(TokenType.BracketOpen)) {
      return null;
    }

    const identifier = this.read(TokenType.Identifier, true, "typeIdentifier");

    if (!identifier) {
      this.consumeIncluding(TokenType.BracketClose);
      return { annotatedType: null, type: NodeType.TypeAnnotation };
    }

    const annotatedType = identifier.value;
    if (!this.read(TokenType.BracketClose, true)) {
      this.consumeIncluding(TokenType.BracketClose);
      return { annotatedType: null, type: NodeType.TypeAnnotation };
    }

    return {
      annotatedType,
      type: NodeType.TypeAnnotation
    };
  });

  tryReadParameterFlow(): ParameterFlow | null {
    const token = this.peak();
    if (token && token.type === TokenType.Annotation) {
      this.next();
      return token.value === "[out]" ? ParameterFlow.Out : ParameterFlow.In;
    }

    return null;
  }

  withBailOutTypes<T>(
    token: TokenType | Array<TokenType>,
    callback: { (): T }
  ): T {
    const { bailOutTypes } = this;
    const { length } = bailOutTypes;
    if (Array.isArray(token)) {
      this.bailOutTypes.push(...token);
    } else {
      this.bailOutTypes.push(token);
    }

    const result = callback();

    this.bailOutTypes.length = length;
    return result;
  }
}
