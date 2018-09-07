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
  analyze({ node, resource }: AnalyzerContext): boolean {
    if (!isCallerNode(node)) {
      return false;
    }

    // This should actually not happen right now
    const { symbol } = node;
    if (!symbol) {
      this.addDiagnostic(node, msgUnresolvedSymbol({ node }));
      return true;
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
        this.addDiagnostic(
          node,
          msgParamaterCountMismatch({
            actualSymbol: symbol,
            existingSymbols
          })
        );
        return true;
      }

      // Check for symbols with a similiar name
      const similiarSymbols = symbols
        .findSimiliarSymbols(symbol.name)
        .filter(filterSymbol);

      if (similiarSymbols.length) {
        this.addDiagnostic(
          node,
          msgSigantureTypo({
            actualSymbol: symbol,
            similiarSymbols
          })
        );
        return true;
      }

      // Still no luck - create database error
      this.addDiagnostic(node, msgInvalidDatabasePrefix({ symbol }));
      return true;
    }

    // Procedure / Query definition with undefined parameters
    if (
      node.type === NodeType.Rule &&
      !symbol.resolvedDefinition &&
      !symbol.isSystem
    ) {
      this.addDiagnostic(node, msgUnresolvedSignature({ symbol, rule: node }));
      return true;
    }

    // Database warnings
    if (symbol.type === SymbolType.Database) {
      const { orphanQueries } = resource.story;
      if (
        (symbol.isDead || !symbol.dbWrites) &&
        !orphanQueries.isOrphan(symbol)
      ) {
        this.addDiagnostic(node, msgDatabaseNoWrite({ symbol }));
        return true;
      } else if (!symbol.dbReads && !orphanQueries.isOrphan(symbol)) {
        this.addDiagnostic(node, msgDatabaseNoRead({ symbol }));
        return true;
      }
    }

    return false;
  }
}
