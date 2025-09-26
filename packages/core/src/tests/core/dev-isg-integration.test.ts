import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDevServer } from '../../core/dev.js';
import type {
  Logger,
  StatiConfig,
  CacheManifest,
  CacheEntry,
  BuildStats,
} from '../../types/index.js';

// Mock dependencies
vi.mock('../../core/build.js');
vi.mock('../../config/loader.js');
vi.mock('../../core/isg/manifest.js');
vi.mock('../../core/isg/deps.js');
vi.mock('../../core/invalidate.js');
vi.mock('chokidar');
vi.mock('ws');
vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn((port: number, host: string, callback?: () => void) => {
      if (callback) callback();
      return mockServer;
    }),
    close: vi.fn((callback?: () => void) => {
      if (callback) callback();
    }),
    on: vi.fn(),
    address: vi.fn(() => ({ port: 3000, address: 'localhost' })),
  })),
}));

const mockServer = {
  listen: vi.fn((port: number, host: string, callback?: () => void) => {
    if (callback) callback();
    return mockServer;
  }),
  close: vi.fn((callback?: () => void) => {
    if (callback) callback();
    return mockServer;
  }),
  on: vi.fn(),
  address: vi.fn(() => ({ port: 3000, address: 'localhost' })),
};

// Mock WebSocket server
vi.mock('ws', () => ({
  WebSocketServer: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn((callback?: () => void) => {
      if (callback) callback();
    }),
    clients: new Set(),
  })),
}));

// Mock chokidar
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(() => Promise.resolve()),
    })),
  },
}));

const mockBuild = vi.mocked(await import('../../core/build.js')).build;
const mockLoadConfig = vi.mocked(await import('../../config/loader.js')).loadConfig;
const mockLoadCacheManifest = vi.mocked(
  await import('../../core/isg/manifest.js'),
).loadCacheManifest;
const mockSaveCacheManifest = vi.mocked(
  await import('../../core/isg/manifest.js'),
).saveCacheManifest;
const mockTrackTemplateDependencies = vi.mocked(
  await import('../../core/isg/deps.js'),
).trackTemplateDependencies;
const mockInvalidate = vi.mocked(await import('../../core/invalidate.js')).invalidate;

describe('ISG-Enhanced Dev Server Integration', () => {
  const mockLogger: Logger = {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockLoadConfig.mockResolvedValue({
      srcDir: 'site',
      staticDir: 'public',
      outDir: 'dist',
    } as StatiConfig);

    mockBuild.mockResolvedValue({
      totalPages: 0,
      assetsCount: 0,
      buildTimeMs: 0,
      outputSizeBytes: 0,
      cacheHits: 0,
      cacheMisses: 0,
    } as BuildStats);
    mockLoadCacheManifest.mockResolvedValue(null);
    mockSaveCacheManifest.mockResolvedValue(undefined);
    mockTrackTemplateDependencies.mockResolvedValue([]);
    mockInvalidate.mockResolvedValue({
      invalidatedCount: 0,
      invalidatedPaths: [],
      clearedAll: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create dev server with ISG integration', async () => {
    // Create dev server instance
    const server = await createDevServer({
      port: 3000,
      logger: mockLogger,
    });

    // Verify server was created
    expect(server).toBeDefined();
    expect(server.url).toBe('http://localhost:3000');
    expect(mockLoadConfig).toHaveBeenCalled();

    // Start the server
    await server.start();

    // Verify initial build was called
    expect(mockBuild).toHaveBeenCalledWith({
      logger: mockLogger,
      force: false,
      clean: false,
    });

    // Stop server
    await server.stop();
  });

  it('should handle ISG cache manifest in file watching', async () => {
    // Setup cache manifest with dependencies
    const mockCacheEntry: CacheEntry = {
      path: 'about.html',
      inputsHash: 'input-hash1',
      deps: ['layout.eta', 'partials/header.eta'],
      tags: [],
      renderedAt: new Date().toISOString(),
      ttlSeconds: 3600,
    };

    const mockCacheManifest: CacheManifest = {
      entries: {
        'about.html': mockCacheEntry,
        'contact.html': {
          ...mockCacheEntry,
          path: 'contact.html',
          deps: ['layout.eta', 'partials/footer.eta'],
          inputsHash: 'input-hash2',
        },
        'blog/post1.html': {
          ...mockCacheEntry,
          path: 'blog/post1.html',
          deps: ['blog-layout.eta'],
          inputsHash: 'input-hash3',
        },
      },
    };

    mockLoadCacheManifest.mockResolvedValue(mockCacheManifest);

    const server = await createDevServer({
      port: 3001,
      logger: mockLogger,
    });

    await server.start();

    // Verify basic server functionality (cache manifest will be used during file watching)
    expect(mockBuild).toHaveBeenCalled();
    expect(server.url).toBe('http://localhost:3001');

    await server.stop();
  });

  it('should handle missing cache manifest gracefully', async () => {
    mockLoadCacheManifest.mockResolvedValue(null);

    const server = await createDevServer({
      port: 3002,
      logger: mockLogger,
    });

    await server.start();

    expect(mockBuild).toHaveBeenCalled();

    await server.stop();
  });

  it('should handle cache loading errors gracefully', async () => {
    // Mock invalidate to handle cache loading errors gracefully
    mockInvalidate.mockResolvedValue({
      invalidatedCount: 0,
      invalidatedPaths: [],
      clearedAll: false,
    });
    mockLoadCacheManifest.mockRejectedValue(new Error('Cache file corrupted'));

    const server = await createDevServer({
      port: 3003,
      logger: mockLogger,
    });

    await server.start();

    expect(mockInvalidate).toHaveBeenCalled();
    expect(mockBuild).toHaveBeenCalled();

    await server.stop();
  });

  it('should handle build errors during startup gracefully', async () => {
    mockBuild.mockRejectedValue(new Error('Build failed'));

    const server = await createDevServer({
      port: 3004,
      logger: mockLogger,
    });

    // Dev server should still be created and handle errors gracefully
    expect(server).toBeDefined();
    expect(server.url).toBe('http://localhost:3004');

    // Start should handle the error gracefully and start the server
    await expect(server.start()).resolves.toBeUndefined();

    // Error should be logged
    expect(mockLogger.error).toHaveBeenCalled();

    await server.stop();
  });
});
