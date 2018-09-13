import { LanguageClient } from "vscode-languageclient/lib/main";
import {
  CancellationToken,
  FileSearchOptions,
  FileSearchProvider,
  FileSearchQuery,
  Progress,
  TextSearchOptions,
  TextSearchProvider,
  TextSearchResult,
  TextSearchQuery,
  Uri,
  workspace,
} from "vscode";

import Client from "../../Client";
import escapeRegExp from "../../../shared/escapeRegExp";
import Feature from "../Feature";
import { GoalInfo } from "../../../shared/notifications";

import {
  divSearchResultEvent,
  DivSearchResultArgs
} from "../../../shared/notifications.proposed";

import {
  divSearchRequest,
  DivSearchParams
} from "../../../shared/requests.proposed";

export default class SearchFeature extends Feature
  implements FileSearchProvider, TextSearchProvider {
  private currentSearchProgress: Progress<TextSearchResult> | null = null;

  constructor(client: Client) {
    super(client);

    client.context.subscriptions.push(
      workspace.registerTextSearchProvider("file", this)
    );

    client.context.subscriptions.push(
      workspace.registerFileSearchProvider("file", this)
    );
  }

  initialize(connection: LanguageClient) {
    connection.onNotification(divSearchResultEvent, this.handleDivSearchResult);
  }

  handleDivSearchResult = async (result: DivSearchResultArgs) => {
    const { currentSearchProgress } = this;
    const connection = await this.client.getConnection();
    const converter = connection.protocol2CodeConverter;

    if (currentSearchProgress) {
      currentSearchProgress.report({
        uri: Uri.parse(result.uri),
        range: converter.asRange(result.range),
        preview: {
          text: result.preview.text,
          match: converter.asRange(result.preview.match),
        },
      });
    }
  };

  provideFileSearchResults(query: FileSearchQuery, options: FileSearchOptions, token: CancellationToken): Thenable<Uri[]> {
    const goals = this.client.getRootGoals();
    const pattern = new RegExp(escapeRegExp(query.pattern), 'i');

    return Promise.resolve(SearchFeature.findGoals(goals, pattern));
  }

  async provideTextSearchResults(
    query: TextSearchQuery,
    options: TextSearchOptions,
    progress: Progress<TextSearchResult>,
    token: CancellationToken
  ) {
    const connection = await this.client.getConnection();
    const params: DivSearchParams = {
      options,
      query
    };

    this.currentSearchProgress = progress;
    await connection.sendRequest<void>(divSearchRequest, params, token);

    if (this.currentSearchProgress === progress) {
      this.currentSearchProgress = null;
    }
  }

  static findGoals(goals: Array<GoalInfo>, pattern: RegExp, result: Array<Uri> = []): Array<Uri> {
    for (const goal of goals) {
      if (pattern.test(goal.name)) {
        result.push(Uri.parse(goal.uri));
      }

      if (goal.children) {
        this.findGoals(goal.children, pattern, result);
      }
    }

    return result;
  }
}
