import isCallerNode from "../../../parsers/story/utils/isCallerNode";
import msgDatabaseNoWrite from "../messages/msgDatabaseNoWrite";
import msgDatabaseNoRead from "../messages/msgDatabaseNoRead";
import msgInvalidDatabasePrefix from "../messages/msgInvalidDatabasePrefix";
import msgParamaterCountMismatch from "../messages/msgParamaterCountMismatch";
import msgSigantureTypo from "../messages/msgSigantureTypo";
import msgUnresolvedSignature from "../messages/msgUnresolvedSignature";
import msgUnresolvedSymbol from "../messages/msgUnresolvedSymbol";
import Symbol from "../Symbol";
import { AnalyzerContext, SyncAnalyzer } from "./Analyzer";
import { SymbolType } from "../models/symbol";
import { NodeType } from "../../../parsers/story/models/nodes";

export default class SymbolTypesAnalyzer extends SyncAnalyzer {
  analyze({ node, resource }: AnalyzerContext) {
    if (!isCallerNode(node)) return;
    const { symbol } = node;

    // This should actually not happen right now
    if (!symbol) {
      return this.addDiagnostic(node, msgUnresolvedSymbol({ node }));
    }

    // Helper: Filter out invalid symbols
    const filterSymbol = (existingSymbol: Symbol) =>
      existingSymbol !== symbol && existingSymbol.type !== SymbolType.Unknown;

    // Symbol type is unknown
    if (symbol.type === SymbolType.Unknown) {
      // Check for symbol with different parameter count
      const { symbols } = resource.story;
      const existingSymbols = symbols
        .findSymbols(symbol.name)
        .filter(filterSymbol);

      if (existingSymbols.length) {
        return this.addDiagnostic(
          node,
          msgParamaterCountMismatch({
            actualSymbol: symbol,
            existingSymbols
          })
        );
      }

      // Check for symbols with a similiar name
      const similiarSymbols = symbols
        .findSimiliarSymbols(symbol.name)
        .filter(filterSymbol);

      if (similiarSymbols.length) {
        return this.addDiagnostic(
          node,
          msgSigantureTypo({
            actualSymbol: symbol,
            similiarSymbols
          })
        );
      }

      // Still no luck - create database error
      return this.addDiagnostic(node, msgInvalidDatabasePrefix({ symbol }));
    }

    // Procedure / Query definition with undefined parameters
    if (
      node.type === NodeType.Rule &&
      !symbol.resolvedDefinition &&
      !symbol.isSystem
    ) {
      return this.addDiagnostic(
        node,
        msgUnresolvedSignature({ symbol, rule: node })
      );
    }

    // Database warnings
    if (symbol.type === SymbolType.Database) {
      if (symbol.isDead || !symbol.dbWrites) {
        return this.addDiagnostic(node, msgDatabaseNoWrite({ symbol }));
      } else if (!symbol.dbReads && symbol.searchName !== "db_noop") {
        return this.addDiagnostic(node, msgDatabaseNoRead({ symbol }));
      }
    }
  }
}
