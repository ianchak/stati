/**
 * The dev server's rebuild queue, driven directly: builds are promises the tests settle.
 */
import { describe, it, expect, vi } from 'vitest';
import { setImmediate } from 'node:timers/promises';
import { createRebuildQueue } from '../../src/core/rebuild-queue.js';
import type { FileChange, RebuildQueueOptions } from '../../src/core/rebuild-queue.js';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets the queue run every step it can before the next build settles */
function flush(): Promise<void> {
  return setImmediate();
}

function createLogger() {
  return {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  };
}

/**
 * A queue whose builds wait for the test, recording each build's changes and the order in which
 * the queue calls back.
 *
 * @param buildEnd - Replaces the recorded onBuildEnd; null leaves it out
 */
function createHarness(buildEnd?: RebuildQueueOptions['onBuildEnd'] | null) {
  const builds: Array<{ changes: FileChange[] } & Deferred<boolean>> = [];
  const calls: string[] = [];
  const logger = createLogger();
  const onError = vi.fn((error: Error | null) => {
    calls.push(error ? `error: ${error.message}` : 'error cleared');
  });
  const reload = vi.fn(() => {
    calls.push('reload');
  });
  const onBuildEnd = vi.fn(() => {
    calls.push('build end');
  });
  const queue = createRebuildQueue({
    runBuild: (changes) => {
      const build = deferred<boolean>();
      builds.push({ changes, ...build });
      calls.push(`build ${changes.map((change) => change.path).join(', ')}`);
      return build.promise;
    },
    ...(buildEnd !== null && { onBuildEnd: buildEnd ?? onBuildEnd }),
    onError,
    reload,
    logger,
  });
  return { queue, builds, calls, logger, onError, reload, onBuildEnd };
}

describe('createRebuildQueue', () => {
  it('starts a build for the first change at once', () => {
    const { queue, builds } = createHarness();

    void queue.enqueue('/site/index.md', 'change');

    expect(builds.map((build) => build.changes)).toEqual([
      [{ path: '/site/index.md', eventType: 'change' }],
    ]);
  });

  it('builds the changes made while a build runs together, in one build after it', async () => {
    const { queue, builds } = createHarness();

    const idle = queue.enqueue('/site/index.md', 'change');
    void queue.enqueue('/site/about.md', 'add');
    void queue.enqueue('/public/old.png', 'unlink');
    expect(builds).toHaveLength(1);

    builds[0]!.resolve(true);
    await flush();

    expect(builds).toHaveLength(2);
    expect(builds[1]!.changes).toEqual([
      { path: '/site/about.md', eventType: 'add' },
      { path: '/public/old.png', eventType: 'unlink' },
    ]);

    builds[1]!.resolve(true);
    await idle;
    expect(builds).toHaveLength(2);
  });

  it('keeps the last event for a file, in the order the files first changed', async () => {
    const { queue, builds } = createHarness();

    void queue.enqueue('/site/index.md', 'change');
    void queue.enqueue('/site/b.md', 'add');
    void queue.enqueue('/site/a.md', 'change');
    void queue.enqueue('/site/b.md', 'change');
    void queue.enqueue('/site/b.md', 'unlink');
    builds[0]!.resolve(true);
    await flush();

    expect(builds[1]!.changes).toEqual([
      { path: '/site/b.md', eventType: 'unlink' },
      { path: '/site/a.md', eventType: 'change' },
    ]);
  });

  it('returns the same promise while the queue is busy, and a new one after it was idle', async () => {
    const { queue, builds } = createHarness();

    const first = queue.enqueue('/site/index.md', 'change');
    expect(queue.enqueue('/site/about.md', 'change')).toBe(first);

    builds[0]!.resolve(true);
    await flush();
    builds[1]!.resolve(true);
    await first;

    const next = queue.enqueue('/site/index.md', 'change');
    expect(next).not.toBe(first);
    expect(builds).toHaveLength(3);
    builds[2]!.resolve(true);
    await next;
  });

  it('clears the error after a build that succeeds, then reloads the pages', async () => {
    const { queue, builds, calls } = createHarness();

    const idle = queue.enqueue('/site/index.md', 'change');
    builds[0]!.resolve(true);
    await idle;

    expect(calls).toEqual(['build /site/index.md', 'error cleared', 'reload', 'build end']);
  });

  it('reports and logs a failed build, and does not reload', async () => {
    const { queue, builds, logger, onError, reload, onBuildEnd } = createHarness();

    const idle = queue.enqueue('/site/index.md', 'change');
    builds[0]!.reject(new Error('Template error'));
    await idle;

    expect(onError).toHaveBeenCalledExactlyOnceWith(new Error('Template error'));
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/^× Rebuild failed after \d+ms: Template error$/),
    );
    expect(reload).not.toHaveBeenCalled();
    expect(onBuildEnd).toHaveBeenCalledTimes(1);
  });

  it('reports a build that rejects with something other than an Error as an Error', async () => {
    const { queue, builds, onError } = createHarness();

    const idle = queue.enqueue('/site/index.md', 'change');
    builds[0]!.reject('out of memory');
    await idle;

    expect(onError).toHaveBeenCalledExactlyOnceWith(new Error('out of memory'));
  });

  it('keeps the error of a failed build until a build succeeds', async () => {
    const { queue, builds, calls } = createHarness();

    void queue.enqueue('/site/index.md', 'change');
    void queue.enqueue('/site/partials/unused.eta', 'change');
    builds[0]!.reject(new Error('Template error'));
    await flush();
    void queue.enqueue('/site/index.md', 'change');
    // The template no page uses needs no build
    builds[1]!.resolve(false);
    await flush();
    builds[2]!.resolve(true);
    await flush();

    expect(calls).toEqual([
      'build /site/index.md',
      'error: Template error',
      'build end',
      'build /site/partials/unused.eta',
      'build end',
      'build /site/index.md',
      'error cleared',
      'reload',
      'build end',
    ]);
  });

  it('runs onBuildEnd before it takes the changes made meanwhile, and builds those too', async () => {
    const buildEnd = deferred<void>();
    const { queue, builds } = createHarness(() => buildEnd.promise);

    const idle = queue.enqueue('/site/index.md', 'change');
    void queue.enqueue('/site/about.md', 'change');
    builds[0]!.resolve(true);
    await flush();
    // A change while onBuildEnd runs waits for it with the others
    void queue.enqueue('/site/contact.md', 'change');
    expect(builds).toHaveLength(1);

    buildEnd.resolve();
    await flush();

    expect(builds).toHaveLength(2);
    expect(builds[1]!.changes.map((change) => change.path)).toEqual([
      '/site/about.md',
      '/site/contact.md',
    ]);
    builds[1]!.resolve(true);
    await idle;
  });

  it.each([
    ['an Error', new Error('scan failed')],
    ['something else', 'scan failed'],
  ])('logs an onBuildEnd that throws %s, and goes on with the queue', async (_kind, thrown) => {
    const onBuildEnd = vi.fn(() => Promise.reject(thrown));
    const { queue, builds, logger } = createHarness(onBuildEnd);

    const idle = queue.enqueue('/site/index.md', 'change');
    void queue.enqueue('/site/about.md', 'change');
    builds[0]!.resolve(true);
    await flush();
    builds[1]!.resolve(true);
    await idle;

    expect(logger.error).toHaveBeenCalledWith('Failed post-build hook after rebuild: scan failed');
    expect(onBuildEnd).toHaveBeenCalledTimes(2);
    expect(builds).toHaveLength(2);
  });

  it('runs without onBuildEnd', async () => {
    const { queue, builds, reload } = createHarness(null);

    const idle = queue.enqueue('/site/index.md', 'change');
    builds[0]!.resolve(true);
    await idle;

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
