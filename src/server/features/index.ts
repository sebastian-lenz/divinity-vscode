import Feature, { FeatureFactory } from "./Feature";

import ActivityIndicatorFeature from "./activityIndicator";
import ApiExplorerFeature from "./apiExplorer";
import CompletionFeature from "./completion";
import DefinitionFeature from "./definition";
import DiagnosticsFeature from "./diagnostics";
import DivProviderFeature from "./divProvider";
import DocumentSymbolsFeature from "./documentSymbols";
import HoverFeature from "./hover";
import ReferencesFeature from "./references";
import RenameFeature from "./rename";
import SearchFeature from "./search";
import SignatureHelpFeature from "./signatureHelp";
import StoryOutlineFeature from "./storyOutline";

const factories: Array<FeatureFactory> = [
  ActivityIndicatorFeature,
  ApiExplorerFeature,
  CompletionFeature,
  DefinitionFeature,
  DiagnosticsFeature,
  DivProviderFeature,
  DocumentSymbolsFeature,
  HoverFeature,
  ReferencesFeature,
  RenameFeature,
  SearchFeature,
  SignatureHelpFeature,
  StoryOutlineFeature
];

export { Feature };
export default factories;
