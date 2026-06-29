import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setTimeout as sleep } from 'node:timers/promises';
import { createDevServer } from '../../src/core/dev.js';
import { refreshCssOutputWatcher } from '../../src/core/utils/dev-css-watcher.utils.js';
import { loadConfig } from '../../src/config/loader.js';
import { build } from '../../src/core/build.js';
import { invalidate } from '../../src/core/invalidate.js';
import * as fsUtils from '../../src/core/utils/fs.utils.js';

const { mockFg, createdWatchers, createdWsServers } = vi.hoisted(() => ({
  mockFg: vi.fn(),
  createdWatchers: [] as Array<{
    on: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    emit: (event: string, value?: string) => void;
  }>,
  createdWsServers: [] as Array<{
    on: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    clients: Set<unknown>;
  }>,
}));

const mockLoadConfig = vi.mocked(loadConfig);
const mockBuild = vi.mocked(build);
const mockInvalidate = vi.mocked(invalidate);

vi.mock('fast-glob', () => ({
  default: mockFg,
}));

vi.mock('ws', () => ({
  WebSocketServer: vi.fn(() => {
    const wsServer = {
      on: vi.fn(),
      close: vi.fn(),
      clients: new Set<unknown>(),
    };
    createdWsServers.push(wsServer);
    return wsServer;
  }),
}));

vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn((_port: number, _host: string, callback?: () => void) => {
      if (callback) callback();
    }),
    close: vi.fn((callback?: () => void) => {
      if (callback) callback();
    }),
    on: vi.fn(),
  })),
}));

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => {
      const handlers = new Map<string, (value: string) => void>();
      const watcher = {
        on: vi.fn((event: string, cb: (value: string) => void) => {
          handlers.set(event, cb);
          return watcher;
        }),
        close: vi.fn().mockResolvedValue(undefined),
        emit: (event: string, value = '') => {
          const cb = handlers.get(event);
          if (cb) cb(value);
        },
      };
      createdWatchers.push(watcher);
      return watcher;
    }),
  },
}));

vi.mock('../../src/core/utils/fs.utils.js', () => ({
  pathExists: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../src/core/build.js', () => ({
  build: vi.fn(),
}));

vi.mock('../../src/core/invalidate.js', () => ({
  invalidate: vi.fn(),
}));

vi.mock('../../src/core/templates.js', () => ({
  clearTemplateEngineCache: vi.fn(),
}));

vi.mock('../../src/core/markdown.js', () => ({
  clearMarkdownProcessorCache: vi.fn(),
}));

vi.mock('../../src/core/isg/index.js', () => ({
  loadCacheManifest: vi.fn().mockResolvedValue(null),
  saveCacheManifest: vi.fn().mockResolvedValue(undefined),
  computeNavigationHash: vi.fn().mockReturnValue('hash123'),
  DevServerLockManager: class {
    async acquireLock() {
      return Promise.resolve();
    }
    async releaseLock() {
      return Promise.resolve();
    }
  },
}));

function createLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    status: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  };
}

async function waitFor(condition: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await sleep(10);
  }
  throw new Error('Timed out waiting for condition');
}

describe('Dev Server CSS watcher reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdWatchers.length = 0;
    createdWsServers.length = 0;
    delete process.env.STATI_DEV_DISABLE_CSS_WATCHER;
    delete process.env.STATI_DEV_DISABLE_WS_RELOAD;

    vi.mocked(fsUtils.pathExists).mockResolvedValue(true);

    mockLoadConfig.mockResolvedValue({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
    });

    mockBuild.mockResolvedValue({
      totalPages: 1,
      assetsCount: 1,
      buildTimeMs: 5,
      outputSizeBytes: 128,
    });

    mockInvalidate.mockResolvedValue({
      invalidatedCount: 1,
      invalidatedPaths: ['/'],
      clearedAll: true,
    });
  });

  it('recreates CSS watcher when output CSS files change after rebuild', async () => {
    const cssA = 'C:/repo/dist/styles.css';
    const cssB = 'C:/repo/dist/chunk.css';

    mockFg.mockResolvedValueOnce([cssA]).mockResolvedValueOnce([cssA, cssB]);

    const logger = createLogger();
    const devServer = await createDevServer({ port: 3190, logger });
    await devServer.start();

    expect(createdWatchers).toHaveLength(2);

    // Source/static watcher is created first and drives incremental rebuilds.
    createdWatchers[0]!.emit('change', 'public/file.txt');

    await waitFor(() => createdWatchers.length === 3);

    // The old CSS watcher should be closed, then recreated with new file set.
    expect(createdWatchers[1]!.close).toHaveBeenCalledTimes(1);

    await devServer.stop();
  });

  it('does not recreate CSS watcher when output CSS files are unchanged', async () => {
    const cssA = 'C:/repo/dist/styles.css';

    mockFg.mockResolvedValueOnce([cssA]).mockResolvedValueOnce([cssA]);

    const logger = createLogger();
    const devServer = await createDevServer({ port: 3191, logger });
    await devServer.start();

    expect(createdWatchers).toHaveLength(2);

    createdWatchers[0]!.emit('change', 'public/file.txt');

    await waitFor(() => mockBuild.mock.calls.length >= 2);

    expect(createdWatchers).toHaveLength(2);
    expect(createdWatchers[1]!.close).not.toHaveBeenCalled();

    await devServer.stop();
  });

  it('starts without CSS watcher when outDir does not exist after initial build', async () => {
    vi.mocked(fsUtils.pathExists).mockResolvedValue(false);

    const logger = createLogger();
    const devServer = await createDevServer({ port: 3192, logger });
    await devServer.start();

    // Only the source/static watcher should be created; no CSS watcher.
    expect(createdWatchers).toHaveLength(1);
    expect(mockFg).not.toHaveBeenCalled();

    await devServer.stop();
  });

  it('logs diagnostics and skips CSS watcher when CSS watcher env flag is enabled', async () => {
    process.env.STATI_DEV_DISABLE_CSS_WATCHER = '1';

    const logger = createLogger();
    const devServer = await createDevServer({ port: 3193, logger });
    await devServer.start();

    // Only source/static watcher should exist when CSS watcher is disabled.
    expect(createdWatchers).toHaveLength(1);
    expect(mockFg).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('  • [diagnostic] CSS output watcher disabled');

    await devServer.stop();
  });

  it('suppresses WebSocket reload broadcasts when reload env flag is enabled', async () => {
    process.env.STATI_DEV_DISABLE_WS_RELOAD = 'true';

    const cssA = 'C:/repo/dist/styles.css';
    mockFg.mockResolvedValueOnce([cssA]).mockResolvedValueOnce([cssA]);

    const wsClient = { readyState: 1, send: vi.fn() };
    const logger = createLogger();
    const devServer = await createDevServer({ port: 3194, logger });
    await devServer.start();

    expect(createdWsServers).toHaveLength(1);
    createdWsServers[0]!.clients.add(wsClient);

    // Trigger source rebuild path (performIncrementalRebuild).
    createdWatchers[0]!.emit('change', 'site/index.md');
    await waitFor(() => mockBuild.mock.calls.length >= 2);

    // Trigger CSS output watcher change path (broadcastReload helper).
    expect(createdWatchers[1]).toBeDefined();
    createdWatchers[1]!.emit('change', cssA);

    expect(wsClient.send).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      '  • [diagnostic] WebSocket reload broadcast disabled',
    );

    await devServer.stop();
  });

  it('logs post-build hook errors when CSS watcher refresh fails', async () => {
    const cssA = 'C:/repo/dist/styles.css';
    mockFg.mockResolvedValueOnce([cssA]).mockRejectedValueOnce(new Error('scan failed'));

    const logger = createLogger();
    const devServer = await createDevServer({ port: 3195, logger });
    await devServer.start();

    createdWatchers[0]!.emit('change', 'site/index.md');

    await waitFor(() =>
      logger.error.mock.calls.some(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('Failed post-build hook after rebuild: scan failed'),
      ),
    );

    await devServer.stop();
  });
});

describe('refreshCssOutputWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdWatchers.length = 0;
    vi.mocked(fsUtils.pathExists).mockResolvedValue(true);
  });

  it('returns null and closes previous watcher when CSS output becomes empty', async () => {
    const existingWatcher = {
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as { close: () => Promise<void> };

    mockFg.mockResolvedValueOnce([]);

    const result = await refreshCssOutputWatcher({
      outDir: 'dist',
      logger: createLogger(),
      wsServer: null,
      disableWsReload: false,
      cssWatcher: existingWatcher as never,
      watchedCssFiles: new Set(['C:/repo/dist/styles.css']),
    });

    expect(existingWatcher.close).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('broadcasts reload only to open websocket clients', async () => {
    const cssA = 'C:/repo/dist/styles.css';
    mockFg.mockResolvedValueOnce([cssA]);

    const logger = createLogger();
    const openClient = { readyState: 1, send: vi.fn() };
    const closedClient = { readyState: 3, send: vi.fn() };

    const watcher = await refreshCssOutputWatcher({
      outDir: 'dist',
      logger,
      wsServer: { clients: new Set([openClient, closedClient]) } as never,
      disableWsReload: false,
      cssWatcher: null,
      watchedCssFiles: new Set(),
    });

    expect(watcher).not.toBeNull();
    createdWatchers[0]!.emit('change', cssA);

    expect(logger.info).toHaveBeenCalledWith('▸ C:/repo/dist/styles.css updated');
    expect(openClient.send).toHaveBeenCalledWith(JSON.stringify({ type: 'reload' }));
    expect(closedClient.send).not.toHaveBeenCalled();
  });
});
