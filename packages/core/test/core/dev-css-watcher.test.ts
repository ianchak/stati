import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setTimeout as sleep } from 'node:timers/promises';
import { createDevServer } from '../../src/core/dev.js';
import { loadConfig } from '../../src/config/loader.js';
import { build } from '../../src/core/build.js';
import { invalidate } from '../../src/core/invalidate.js';

const { mockFg, createdWatchers } = vi.hoisted(() => ({
  mockFg: vi.fn(),
  createdWatchers: [] as Array<{
    on: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    emit: (event: string, value?: string) => void;
  }>,
}));

const mockLoadConfig = vi.mocked(loadConfig);
const mockBuild = vi.mocked(build);
const mockInvalidate = vi.mocked(invalidate);

vi.mock('fast-glob', () => ({
  default: mockFg,
}));

vi.mock('ws', () => ({
  WebSocketServer: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn(),
    clients: new Set(),
  })),
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
});
