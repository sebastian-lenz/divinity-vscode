import Feature, { FeatureFactory } from "./Feature";

import ActivityIndicatorFeature from "./activityIndicator";
import ApiExplorerFeature from "./apiExplorer";
import DivProviderFeature from "./divProvider";
import StoryOutlineFeature from "./storyOutline";
import TaskProviderFeature from "./taskProvider";

const factories: Array<FeatureFactory> = [
  ActivityIndicatorFeature,
  ApiExplorerFeature,
  DivProviderFeature,
  StoryOutlineFeature,
  TaskProviderFeature
];

export { Feature };
export default factories;
