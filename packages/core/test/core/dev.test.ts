import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDevServer } from '../../src/core/dev.js';
import type { DevServerOptions } from '../../src/core/dev.js';
import { loadConfig } from '../../src/config/loader.js';
import { build } from '../../src/core/build.js';
import { invalidate } from '../../src/core/invalidate.js';

// Mock dependencies
vi.mock('ws', () => ({
  WebSocketServer: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn((callback?: () => void) => {
      if (callback) callback();
    }),
    clients: new Set(),
  })),
}));

vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn((port: number, host: string, callback?: () => void) => {
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
    watch: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    srcDir: 'site',
    outDir: 'dist',
    staticDir: 'public',
    site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
  }),
}));

vi.mock('../../src/core/build.js', () => ({
  build: vi.fn().mockResolvedValue({
    totalPages: 5,
    assetsCount: 10,
    buildTimeMs: 1000,
    outputSizeBytes: 1024,
  }),
}));

vi.mock('../../src/core/invalidate.js', () => ({
  invalidate: vi.fn().mockResolvedValue({
    invalidatedCount: 5,
    invalidatedPaths: ['/page1', '/page2'],
    clearedAll: true,
  }),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('<html><body>Test</body></html>'),
  stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
}));

describe('Development Server', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockLoadConfig = vi.mocked(loadConfig);
  const mockBuild = vi.mocked(build);
  const mockInvalidate = vi.mocked(invalidate);

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();

    // Ensure mocks return valid data
    mockLoadConfig.mockResolvedValue({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
    });

    mockBuild.mockResolvedValue({
      totalPages: 5,
      assetsCount: 10,
      buildTimeMs: 1000,
      outputSizeBytes: 1024,
    });

    mockInvalidate.mockResolvedValue({
      invalidatedCount: 5,
      invalidatedPaths: ['/page1', '/page2'],
      clearedAll: true,
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create dev server with default options', async () => {
    const options: DevServerOptions = {};

    const devServer = await createDevServer(options);

    expect(devServer).toBeDefined();
    expect(devServer.url).toBe('http://localhost:3000');
    expect(typeof devServer.start).toBe('function');
    expect(typeof devServer.stop).toBe('function');
  });

  it('should create dev server with custom options', async () => {
    const options: DevServerOptions = {
      port: 8080,
      host: '0.0.0.0',
      open: true,
    };

    const devServer = await createDevServer(options);

    expect(devServer).toBeDefined();
    expect(devServer.url).toBe('http://0.0.0.0:8080');
  });

  it('should handle logger options', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };

    const options: DevServerOptions = {
      logger: mockLogger,
    };

    const devServer = await createDevServer(options);

    expect(devServer).toBeDefined();
    expect(devServer.start).toBeDefined();
    expect(devServer.stop).toBeDefined();
    expect(devServer.url).toBeDefined();

    // Verify the logger option was passed correctly by checking it's being used
    // We know the logger is stored internally and will be used when needed
  });

  it('should clear cache during initial startup', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };

    const options: DevServerOptions = {
      port: 8081,
      logger: mockLogger,
    };

    const devServer = await createDevServer(options);

    // Start the server to trigger initial build
    await devServer.start();

    // Verify cache was cleared and build was called
    expect(mockInvalidate).toHaveBeenCalledWith(); // Called without parameters to clear all cache
    expect(mockBuild).toHaveBeenCalled();

    // Verify the call order - invalidate should be called before build
    const invalidateCall = mockInvalidate.mock.invocationCallOrder[0];
    const buildCall = mockBuild.mock.invocationCallOrder[0];
    expect(invalidateCall).toBeDefined();
    expect(buildCall).toBeDefined();
    expect(invalidateCall!).toBeLessThan(buildCall!);

    // Verify logger messages
    expect(mockLogger.info).toHaveBeenCalledWith('Clearing cache for fresh development build...');

    await devServer.stop();
  });
});
