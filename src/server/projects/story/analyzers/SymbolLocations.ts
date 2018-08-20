import msgCanOnlyDeleteFromDatabase from "../messages/msgCanOnlyDeleteFromDatabase";
import msgInvalidSymbolInCondition from "../messages/msgInvalidSymbolInCondition";
import msgInvalidSymbolInFact from "../messages/msgInvalidSymbolInFact";
import msgInvalidSymbolInInitialCondition from "../messages/msgInvalidSymbolInInitialCondition";
import msgInvalidSymbolInStatement from "../messages/msgInvalidSymbolInStatement";
import Symbol from "../Symbol";
import { AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { SymbolType } from "../models/symbol";
import {
  NodeType,
  RuleNode,
  SignatureCallNode
} from "../../../parsers/story/models/nodes";

import isCallerNode, {
  CallerNode
} from "../../../parsers/story/utils/isCallerNode";

export default class SymbolLocationsAnalyzer extends SyncAnalyzer {
  analyze({ node, stack }: AnalyzerContext) {
    if (!isCallerNode(node) || !node.symbol) return;
    const { symbol } = node;
    const block = stack[stack.length - 1];
    const rule = stack[stack.length - 2];

    if (node.type === NodeType.Rule) {
      return this.analyzeRule(node, symbol);
    }

    switch (block ? block.type : undefined) {
      case NodeType.ActionBlock:
        if (rule && rule.type === NodeType.Rule) {
          return this.analyzeRuleAction(node, symbol);
        } else {
          return this.analyzeFact(node, symbol);
        }
      case NodeType.ConditionBlock:
        return this.analyzeRuleCondition(node, symbol);
    }

    // Should never happen
    console.error("Caller outside of block");
  }

  analyzeFact(node: SignatureCallNode, symbol: Symbol) {
    this.ensureNotOnDatabase(node, symbol);

    if (
      symbol.type !== SymbolType.Database &&
      symbol.type !== SymbolType.Call
    ) {
      this.addDiagnostic(node, msgInvalidSymbolInFact({ symbol }));
    }
  }

  analyzeRule(node: RuleNode, symbol: Symbol) {
    const { ruleType } = node;
    let isValid: boolean = false;

    switch (ruleType) {
      case "PROC":
        isValid = symbol.type === SymbolType.Call && !symbol.isSystem;
        break;

      case "QRY":
        isValid = symbol.type === SymbolType.Query && !symbol.isSystem;
        break;

      case "IF":
        isValid =
          symbol.type === SymbolType.Event ||
          symbol.type === SymbolType.Database;
        break;
    }

    if (!isValid) {
      this.addDiagnostic(
        node,
        msgInvalidSymbolInInitialCondition({ ruleType, symbol })
      );
    }
  }

  analyzeRuleAction(node: SignatureCallNode, symbol: Symbol) {
    this.ensureNotOnDatabase(node, symbol);

    if (
      symbol.type !== SymbolType.Database &&
      symbol.type !== SymbolType.Call
    ) {
      this.addDiagnostic(node, msgInvalidSymbolInStatement({ symbol }));
    }
  }

  analyzeRuleCondition(node: CallerNode, symbol: Symbol) {
    if (
      symbol.type !== SymbolType.Database &&
      symbol.type !== SymbolType.Query
    ) {
      this.addDiagnostic(node, msgInvalidSymbolInCondition({ symbol }));
    }
  }

  ensureNotOnDatabase(node: SignatureCallNode, symbol: Symbol) {
    if (
      node.isInverted &&
      !(symbol.type === SymbolType.Database || symbol.type === SymbolType.Query)
    ) {
      this.addDiagnostic(node, msgCanOnlyDeleteFromDatabase({ symbol }));
    }
  }
}
