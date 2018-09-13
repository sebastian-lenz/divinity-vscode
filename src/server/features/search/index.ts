import { CancellationToken, Connection } from "vscode-languageserver";
import { Minimatch } from 'minimatch';

import Document from "./Document";
import Feature from "../Feature";

import { divSearchResultEvent } from "../../../shared/notifications.proposed";

import {
  divSearchRequest,
  DivSearchParams
} from "../../../shared/requests.proposed";
import escapeRegExp from "../../../shared/escapeRegExp";

export default class SearchFeature extends Feature {
  initialize(connection: Connection): void {
    connection.onRequest(divSearchRequest, this.handleDivSearch);
  }

  handleDivSearch = async (
    { options, query }: DivSearchParams,
    token: CancellationToken
  ): Promise<void> => {
    const { connection } = this.server;
    const { projects } = this.server.projects;

    const includes = options.includes && options.includes.length
      ? options.includes.map(pattern => new Minimatch(pattern))
      : null;

    const excludes = options.excludes && options.excludes.length
      ? options.excludes.map(pattern => new Minimatch(pattern))
      : null;

    let flags = "g";
    let regExpStr = query.pattern;
    if (!query.isRegExp) {
      regExpStr = escapeRegExp(regExpStr);
    }

    if (query.isWordMatch) {
      regExpStr = `\\b${regExpStr}\\b`;
    }

    if (!query.isCaseSensitive) {
      flags += "i";
    }

    for (const project of projects) {
      const goals = project.story.getGoals();

      for (const goal of goals) {
        if (token.isCancellationRequested) {
          return;
        }

        if (excludes || includes) {
          let isExcluded = false;
          let isIncluded = false;

          for (const path of goal.getPaths()) {
            if (excludes && excludes.some(exclude => exclude.match(path))) {
              isExcluded = true;
            }

            if (includes && includes.some(include => include.match(path))) {
              isIncluded = true;
            }
          }

          if ((excludes && isExcluded) || (includes && !isIncluded)) {
            continue;
          }
        }

        const source = await goal.resource.getSource();
        const document = new Document(goal.resource.getUri(), source);
        for (const result of document.search(new RegExp(regExpStr, flags))) {
          connection.sendNotification(divSearchResultEvent, result);
        }
      }
    }
  };
}
