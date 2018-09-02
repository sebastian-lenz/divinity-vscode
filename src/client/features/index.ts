import Feature, { FeatureFactory } from "./Feature";

import ActivityIndicatorFeature from "./activityIndicator";
import ApiExplorerFeature from "./apiExplorer";
import DebugProviderFeature from "./debugProvider";
import DivProviderFeature from "./divProvider";
import StoryOutlineFeature from "./storyOutline";
import TaskProviderFeature from "./taskProvider";

const factories: Array<FeatureFactory> = [
  ActivityIndicatorFeature,
  ApiExplorerFeature,
  DebugProviderFeature,
  DivProviderFeature,
  StoryOutlineFeature,
  TaskProviderFeature
];

export { Feature };
export default factories;
