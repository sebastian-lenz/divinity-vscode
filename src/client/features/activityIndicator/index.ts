import { EventEmitter } from "events";
import { LanguageClient } from "vscode-languageclient/lib/main";
import { Progress, ProgressLocation, window } from "vscode";

import Feature from "../Feature";
import {
  levelIndexReadyEvent,
  levelIndexStartEvent,
  projectAddedEvent,
  ProjectEventArgs,
  projectReadyEvent
} from "../../../shared/notifications";

type WindowProgress = Progress<{ message?: string; increment?: number }>;

export default class ActivityIndicatorFeature extends Feature {
  private events: EventEmitter = new EventEmitter();

  initialize(connection: LanguageClient) {
    const { events } = this;

    connection.onNotification(levelIndexStartEvent, this.handleLevelIndexStart);

    connection.onNotification(levelIndexReadyEvent, args =>
      events.emit(levelIndexReadyEvent, args)
    );

    connection.onNotification(projectAddedEvent, this.handleProjectAdded);

    connection.onNotification(projectReadyEvent, args =>
      events.emit(projectReadyEvent, args)
    );
  }

  private handleLevelIndexStart = (args: ProjectEventArgs) => {
    const { UUID } = args.project.meta;

    const createProgress = () =>
      new Promise(resolve => {
        const { events } = this;

        function onReady({ project }: ProjectEventArgs) {
          if (UUID !== project.meta.UUID) return;
          events.removeListener(levelIndexReadyEvent, onReady);
          resolve();
        }

        events.addListener(levelIndexReadyEvent, onReady);
      });

    window.withProgress(
      {
        cancellable: false,
        location: ProgressLocation.Window,
        title: `Indexing levels`
      },
      createProgress
    );
  };

  private handleProjectAdded = (args: ProjectEventArgs) => {
    const { Name, UUID } = args.project.meta;

    // Reemitt for task provider
    this.client.emit(projectAddedEvent, args);

    const createProgress = () =>
      new Promise(resolve => {
        const { events } = this;

        function onReady({ project }: ProjectEventArgs) {
          if (UUID !== project.meta.UUID) return;
          events.removeListener(projectReadyEvent, onReady);
          resolve();
        }

        events.addListener(projectReadyEvent, onReady);
      });

    window.withProgress(
      {
        cancellable: false,
        location: ProgressLocation.Notification,
        title: `Loading project ${Name}`
      },
      createProgress
    );
  };
}
