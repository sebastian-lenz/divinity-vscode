import {
  ParameterInformation,
  ServerCapabilities,
  SignatureHelp,
  SignatureInformation,
  TextDocumentPositionParams
} from "vscode-languageserver";

import Feature from "../Feature";
import printSymbol from "../../projects/story/utils/printSymbol";
import Resource from "../../projects/story/resources/Resource";
import runSafeAsync from "../../utils/runSafeAsync";
import Server from "../../Server";
import Symbol from "../../projects/story/Symbol";
import ucfirst from "../../utils/ucfirst";
import { DefinitionDoc } from "../../documentation/raw/Definition";
import { SymbolType } from "../../projects/story/models/symbol";

import isCallerNode, {
  CallerNode
} from "../../parsers/story/utils/isCallerNode";

function getParameters(
  symbol: Symbol,
  definition: DefinitionDoc | null
): Array<ParameterInformation> {
  return symbol.parameters.map(symbolParam => {
    let documentation: string | undefined;
    if (definition && definition.parameters) {
      const paramDefinition = definition.parameters.find(
        paramDefinition => paramDefinition.name === symbolParam.name
      );

      if (paramDefinition && paramDefinition.description) {
        documentation = ucfirst(paramDefinition.description);
      }
    }

    return {
      documentation,
      label: symbolParam.name
    };
  });
}

async function getSignatures(
  node: CallerNode,
  resource: Resource
): Promise<Array<SignatureInformation>> {
  const { docProvider } = resource.story.project.projects;
  const { name } = node.signature.identifier;
  const doc = await docProvider.getDocumentation(name);
  const signatures: Array<SignatureInformation> = [];
  const symbols = resource.story.symbols.findSymbols(name);

  for (const symbol of symbols) {
    if (symbol.type === SymbolType.Unknown) {
      continue;
    }

    const localDoc = symbol.documentation ? symbol.documentation : doc;
    let symbolDescription: string | undefined;
    if (localDoc && localDoc.description) {
      symbolDescription = ucfirst(localDoc.description);
    }

    signatures.push({
      documentation: symbolDescription,
      label: printSymbol(symbol),
      parameters: getParameters(symbol, localDoc)
    });
  }

  return signatures;
}

function sortSignatures(
  a: SignatureInformation,
  b: SignatureInformation
): number {
  return (
    (a.parameters ? a.parameters.length : 0) -
    (b.parameters ? b.parameters.length : 0)
  );
}

export default class SignatureHelpFeature extends Feature {
  constructor(server: Server) {
    super(server);

    const { connection } = server;
    connection.onSignatureHelp((params, token) =>
      runSafeAsync(
        () => this.handleSignatureHelp(params),
        null,
        `Error while creating signature help for "${params.textDocument.uri}".`,
        token
      )
    );
  }

  getCapabilities(): Partial<ServerCapabilities> {
    return {
      signatureHelpProvider: {
        triggerCharacters: ["("]
      }
    };
  }

  async handleSignatureHelp(
    params: TextDocumentPositionParams
  ): Promise<SignatureHelp | null> {
    const { nodes, resource } = await this.getNodesAt(params);
    if (!nodes || !resource) return null;

    const document = resource.getDocument();
    if (!document) return null;

    const offset = document.offsetAt(params.position);

    for (const node of nodes) {
      if (!isCallerNode(node)) {
        continue;
      }

      const { signature } = node;
      const { identifier, parameters } = signature;
      if (offset < signature.startOffset || offset > signature.endOffset) {
        return null;
      }

      const signatures = await getSignatures(node, resource);
      let activeSignature: number | null = null;
      let activeParameter: number | null = null;
      let numParams = parameters.length;

      for (let index = 0; index < parameters.length; index++) {
        if (offset <= parameters[index].endOffset) {
          activeParameter = index;
          break;
        }
      }

      if (activeParameter == null) {
        activeParameter = parameters.length;
        numParams += 1;
      }

      if (offset <= identifier.endOffset || offset >= signature.endOffset) {
        activeParameter = -1;
      }

      signatures.sort(sortSignatures);
      for (let index = 0; index < signatures.length; index++) {
        const signatureParams = signatures[index].parameters;
        const numSignatureParams = signatureParams ? signatureParams.length : 0;
        if (numParams <= numSignatureParams) {
          activeSignature = index;
          break;
        }
      }

      if (activeSignature === null) {
        activeSignature = signatures.length - 1;
      }

      return {
        activeSignature,
        activeParameter,
        signatures
      };
    }

    return null;
  }
}
