import type { Logger } from '../types/index.js';

/** How a watched file changed */
export type FileChangeEvent = 'add' | 'change' | 'unlink';

/** A watched file that changed */
export interface FileChange {
  path: string;
  eventType: FileChangeEvent;
}

export interface RebuildQueueOptions {
  /**
   * Builds the site for a batch of changes. Resolves to whether it rebuilt pages, false when the
   * changes needed no build; a rejection is a failed build.
   */
  runBuild: (changes: FileChange[]) => Promise<boolean>;
  /** Runs after each batch, failed or not, before the queue takes the changes that came in meanwhile */
  onBuildEnd?: () => Promise<void> | void;
  /**
   * Gets the error of a failed build, and null after a build that succeeds. A batch that needed
   * no build leaves the error as it is.
   */
  onError: (error: Error | null) => void;
  /** Reloads the open pages, after a build that succeeds */
  reload: () => void;
  /** Logs failed builds and a failing `onBuildEnd` */
  logger: Logger;
}

export interface RebuildQueue {
  /**
   * Queues a change. Starts a build unless one is running: the changes that come in while it runs
   * wait for the next build, which takes them all, and the last event for a file wins.
   *
   * @returns Resolves once the queue is empty and no build runs
   */
  enqueue(path: string, eventType: FileChangeEvent): Promise<void>;
}

/**
 * Creates the dev server's rebuild queue: it runs one build at a time and batches the changes
 * that arrive while one runs.
 */
export function createRebuildQueue(options: RebuildQueueOptions): RebuildQueue {
  const { runBuild, onBuildEnd, onError, reload, logger } = options;
  // The last event for each file not yet built, in the order the files first changed
  const pending = new Map<string, FileChangeEvent>();
  let building = false;
  let idle: Promise<void> = Promise.resolve();

  async function drain(): Promise<void> {
    building = true;
    try {
      while (pending.size > 0) {
        const changes = Array.from(pending, ([path, eventType]) => ({ path, eventType }));
        pending.clear();
        const startTime = Date.now();
        try {
          if (await runBuild(changes)) {
            // Cleared first, so the reloaded pages don't show the error overlay
            onError(null);
            reload();
          }
        } catch (error) {
          const buildError = error instanceof Error ? error : new Error(String(error));
          logger.error?.(
            `× Rebuild failed after ${Date.now() - startTime}ms: ${buildError.message}`,
          );
          onError(buildError);
        }

        if (onBuildEnd) {
          try {
            await onBuildEnd();
          } catch (error) {
            logger.error?.(
              `Failed post-build hook after rebuild: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    } finally {
      building = false;
    }
  }

  return {
    enqueue(path, eventType) {
      pending.set(path, eventType);
      if (!building) {
        idle = drain();
      }
      return idle;
    },
  };
}
