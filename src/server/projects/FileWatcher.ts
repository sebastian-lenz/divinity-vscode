import { EventEmitter } from "events";
import { FSWatcher, watch, existsSync, readdirSync, statSync } from "fs";
import { join, normalize } from "path";
import { readDir, stat } from "../../shared/fs";

interface PendingEvent {
  created: number;
  event: string;
  path: string;
}

export interface FileWatcherOptions {
  pattern: RegExp;
  path: string;
  recursive?: boolean;
}

export default class FileWatcher extends EventEmitter {
  readonly path: string;
  readonly pattern: RegExp;
  readonly recursive: boolean;

  private interval: NodeJS.Timer | null = null;
  private pending: Array<PendingEvent> = [];
  private watcher: FSWatcher | null = null;

  constructor(options: FileWatcherOptions) {
    super();

    this.path = options.path;
    this.pattern = options.pattern;
    this.recursive = !!options.recursive;
  }

  dispose() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  async scan(path: string = this.path) {
    this.validate();

    const { pattern, recursive } = this;
    const files = await readDir(path);

    for (const file of files) {
      const filePath = normalize(join(path, file));
      const stats = await stat(filePath);

      if (stats.isDirectory()) {
        if (recursive) {
          await this.scan(filePath);
        }
      } else if (pattern.test(filePath)) {
        this.emit("update", filePath);
      }
    }
  }

  scanSync(path: string = this.path) {
    this.validate();

    const { pattern, recursive } = this;
    const files = readdirSync(path);

    for (const file of files) {
      const filePath = normalize(join(path, file));
      const stats = statSync(filePath);

      if (stats.isDirectory()) {
        if (recursive) {
          this.scanSync(filePath);
        }
      } else if (pattern.test(filePath)) {
        this.emit("update", filePath);
      }
    }
  }

  async scanAndStart() {
    await this.scan();
    this.start();
  }

  scanAndStartSync() {
    this.scanSync();
    this.start();
  }

  start() {
    if (this.watcher) return;
    this.validate();

    const { path, recursive } = this;
    const watcher = watch(path, { recursive });

    watcher.on("change", (type, file) =>
      this.handleFileEvent(type, file as string)
    );

    this.watcher = watcher;
  }

  validate() {
    if (!existsSync(this.path)) {
      throw new Error(`The path ${this.path} does not exist.`);
    }
  }

  private handleFileEvent(type: string, file: string) {
    const { pending } = this;
    const path = normalize(join(this.path, file));
    if (!this.pattern.test(path)) {
      return;
    }

    let event;
    if (type === "rename") {
      event = existsSync(path) ? "update" : "remove";
    } else {
      event = "update";
    }

    let index = 0;
    while (index < pending.length) {
      if (pending[index].path === path) {
        pending.splice(index, 1);
      } else {
        index++;
      }
    }

    pending.push({
      created: Date.now(),
      event,
      path
    });

    this.pending = pending;
    this.startInterval();
  }

  private startInterval() {
    if (this.interval) return;

    const interval = setInterval(() => {
      const { pending } = this;
      const now = Date.now();
      let index = 0;

      while (index < pending.length) {
        const item = pending[index];
        if (now - item.created > 100) {
          pending.splice(index, 1);
          this.emit(item.event, item.path);
        } else {
          index++;
        }
      }

      if (pending.length === 0) {
        clearInterval(interval);
        this.interval = null;
      }
    }, 50);

    this.interval = interval;
  }
}
