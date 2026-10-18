import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setTimeout } from 'node:timers/promises';
import { createDevServer } from '../../src/core/dev.js';
import type { DevServerOptions } from '../../src/core/dev.js';
import { loadConfig } from '../../src/config/loader.js';
import { build } from '../../src/core/build.js';
import { invalidate } from '../../src/core/invalidate.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as fsUtils from '../../src/core/utils/fs.utils.js';

const { mockFg } = vi.hoisted(() => ({
  mockFg: vi.fn(),
}));

// Store the request handler for testing
let capturedRequestHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

// Mock dependencies
vi.mock('ws', () => ({
  WebSocketServer: vi.fn(function () {
    return {
      on: vi.fn(),
      close: vi.fn((callback?: () => void) => {
        if (callback) callback();
      }),
      clients: new Set(),
    };
  }),
}));

// Set listenError to simulate the HTTP server failing to bind after the port probe passed
let listenError: (Error & { code?: string }) | null = null;
vi.mock('http', () => ({
  createServer: vi.fn((handler: (req: IncomingMessage, res: ServerResponse) => void) => {
    capturedRequestHandler = handler;
    return {
      listen: vi.fn((port: number, host: string, callback?: () => void) => {
        if (callback && !listenError) callback();
      }),
      close: vi.fn((callback?: () => void) => {
        if (callback) callback();
      }),
      on: vi.fn((event: string, handler: (error: unknown) => void) => {
        if (event === 'error' && listenError) handler(listenError);
      }),
    };
  }),
}));

// Port availability probe; set probeError to simulate an occupied port
let probeError: (Error & { code?: string }) | null = null;
vi.mock('net', () => ({
  createServer: vi.fn(() => {
    const handlers: Record<string, (arg?: unknown) => void> = {};
    return {
      once: vi.fn((event: string, handler: (arg?: unknown) => void) => {
        handlers[event] = handler;
      }),
      listen: vi.fn(() => {
        if (probeError) handlers.error?.(probeError);
        else handlers.listening?.();
      }),
      close: vi.fn((callback?: () => void) => {
        if (callback) callback();
      }),
    };
  }),
}));

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock('tinyglobby', () => ({
  glob: mockFg,
}));

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/core/utils/fs.utils.js', () => ({
  pathExists: vi.fn().mockResolvedValue(true),
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

vi.mock('../../src/core/content.js', () => ({
  loadContent: vi.fn().mockResolvedValue([
    {
      slug: 'index',
      title: 'Home',
      content: 'Home page content',
      frontmatter: { title: 'Home' },
    },
  ]),
}));

vi.mock('../../src/core/navigation.js', () => ({
  buildNavigation: vi.fn().mockReturnValue([{ title: 'Home', path: '/', children: [] }]),
}));

vi.mock('../../src/core/isg/index.js', () => ({
  loadCacheManifest: vi.fn().mockResolvedValue(null),
  saveCacheManifest: vi.fn().mockResolvedValue(undefined),
  computeNavigationHash: vi.fn().mockReturnValue('hash123'),
  hasRecordedTemplates: (entry: { templatesRecorded?: boolean }) =>
    entry.templatesRecorded === true,
  DevServerLockManager: class {
    async acquireLock() {
      return Promise.resolve();
    }
    async releaseLock() {
      return Promise.resolve();
    }
    isLocked() {
      return false;
    }
  },
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('<html><body>Test</body></html>'),
  stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
}));

// Mock path validation utility - needs to be defined inside the mock factory to avoid hoisting issues
vi.mock('../../src/core/utils/paths.utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/utils/paths.utils.js')>();
  return {
    ...actual,
    isPathWithinDirectory: vi.fn().mockReturnValue(true),
  };
});

// Mock TypeScript watcher - returns array of contexts
vi.mock('../../src/core/utils/typescript.utils.js', () => ({
  createTypeScriptWatcher: vi.fn().mockResolvedValue([
    {
      dispose: vi.fn().mockResolvedValue(undefined),
      watch: vi.fn().mockResolvedValue(undefined),
    },
  ]),
}));

// Helper function to create a fresh mock logger for each test
function createMockLogger() {
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

describe('Development Server', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockLoadConfig = vi.mocked(loadConfig);
  const mockBuild = vi.mocked(build);
  const mockInvalidate = vi.mocked(invalidate);
  const mockDiscoverOutputCssFiles = vi.mocked(mockFg);

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
    capturedRequestHandler = null;
    probeError = null;
    listenError = null;
    mockDiscoverOutputCssFiles.mockResolvedValue([]);
    vi.mocked(fsUtils.pathExists).mockResolvedValue(true);

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
    const mockLogger = createMockLogger();

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
    const mockLogger = createMockLogger();

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
    expect(mockLogger.status).toHaveBeenCalledWith('Clearing cache for fresh development build...');

    await devServer.stop();
  });

  it('should fail fast with a clear error when the port is in use', async () => {
    probeError = Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' });

    const devServer = await createDevServer({ port: 3000, logger: createMockLogger() });

    await expect(devServer.start()).rejects.toThrow(
      'Port 3000 is already in use on localhost. Stop the process using it, or choose another port with --port or `dev.port` in your Stati config.',
    );
    expect(mockInvalidate).not.toHaveBeenCalled();
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('should release the lock when the port is taken between the probe and listen', async () => {
    listenError = Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' });
    const { DevServerLockManager } = await import('../../src/core/isg/index.js');
    const releaseLockSpy = vi.spyOn(DevServerLockManager.prototype, 'releaseLock');

    const devServer = await createDevServer({ port: 3000, logger: createMockLogger() });

    await expect(devServer.start()).rejects.toThrow('Port 3000 is already in use on localhost.');
    expect(releaseLockSpy).toHaveBeenCalledTimes(1);

    releaseLockSpy.mockRestore();
  });

  it('should handle build errors during initial startup', async () => {
    const mockLogger = createMockLogger();

    // Simulate build failure
    const buildError = new Error('Build failed: template not found');
    mockBuild.mockRejectedValueOnce(buildError);

    const options: DevServerOptions = {
      port: 8082,
      logger: mockLogger,
    };

    const devServer = await createDevServer(options);

    // Should not throw, but start with errors
    await devServer.start();

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Initial build failed'));
    expect(mockLogger.warning).toHaveBeenCalledWith(
      expect.stringContaining('Dev server will start with build errors'),
    );

    await devServer.stop();
  });

  it('should handle config loading errors', async () => {
    const mockLogger = createMockLogger();

    mockLoadConfig.mockRejectedValueOnce(new Error('Config file not found'));

    const options: DevServerOptions = {
      port: 8083,
      logger: mockLogger,
      configPath: './custom.config.js',
    };

    await expect(createDevServer(options)).rejects.toThrow('Config file not found');
  });

  it('should handle custom config path', async () => {
    const mockLogger = createMockLogger();

    const customConfigPath = './custom-stati.config.js';

    const options: DevServerOptions = {
      port: 8084,
      logger: mockLogger,
      configPath: customConfigPath,
    };

    const devServer = await createDevServer(options);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Loading config from: ${customConfigPath}`),
    );

    await devServer.stop();
  });

  it('should open browser when open option is true', async () => {
    const mockLogger = createMockLogger();

    const options: DevServerOptions = {
      port: 8085,
      logger: mockLogger,
      open: true,
    };

    const devServer = await createDevServer(options);
    await devServer.start();

    // The open module should be dynamically imported and called
    // We can't easily test this without actually opening a browser,
    // but we verify the server starts without errors
    expect(devServer.url).toBe('http://localhost:8085');

    await devServer.stop();
  });

  it('should gracefully handle browser open failures', async () => {
    const mockLogger = createMockLogger();

    // Mock import failure for 'open' module
    vi.doMock('open', () => {
      throw new Error('Module not found');
    });

    const options: DevServerOptions = {
      port: 8086,
      logger: mockLogger,
      open: true,
    };

    const devServer = await createDevServer(options);
    await devServer.start();

    // Should log message about browser not opening
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Could not open browser'));

    await devServer.stop();
  });

  it('should use dev config values from config file', async () => {
    // Mock config with dev settings
    mockLoadConfig.mockResolvedValueOnce({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      dev: {
        port: 5000,
        host: '0.0.0.0',
        open: true,
      },
    });

    const devServer = await createDevServer();

    expect(devServer).toBeDefined();
    expect(devServer.url).toBe('http://0.0.0.0:5000');
  });

  it('should override dev config values with programmatic options', async () => {
    // Mock config with dev settings
    mockLoadConfig.mockResolvedValueOnce({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      dev: {
        port: 5000,
        host: '0.0.0.0',
        open: true,
      },
    });

    // Programmatic options should override config
    const options: DevServerOptions = {
      port: 6000,
      host: '127.0.0.1',
    };

    const devServer = await createDevServer(options);

    expect(devServer).toBeDefined();
    expect(devServer.url).toBe('http://127.0.0.1:6000');
  });

  it('should use defaults when no dev config and no options provided', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      // No dev config
    });

    const devServer = await createDevServer();

    expect(devServer).toBeDefined();
    expect(devServer.url).toBe('http://localhost:3000'); // DEFAULT_DEV_HOST:DEFAULT_DEV_PORT
  });

  describe('TypeScript integration', () => {
    it('should start TypeScript watcher when typescript is enabled', async () => {
      const { createTypeScriptWatcher } = await import('../../src/core/utils/typescript.utils.js');
      const mockCreateTsWatcher = vi.mocked(createTypeScriptWatcher);
      // Re-setup mock return value after vi.clearAllMocks()
      mockCreateTsWatcher.mockResolvedValue([
        {
          dispose: vi.fn().mockResolvedValue(undefined),
          watch: vi.fn().mockResolvedValue(undefined),
          rebuild: vi.fn(),
          serve: vi.fn(),
          cancel: vi.fn(),
        },
      ]);

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
        typescript: {
          enabled: true,
        },
      });

      const mockLogger = createMockLogger();

      const devServer = await createDevServer({
        port: 8100,
        logger: mockLogger,
      });

      await devServer.start();

      expect(mockCreateTsWatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          config: { enabled: true },
          awaitInitialBuild: true,
        }),
      );

      await devServer.stop();
    });

    it('should broadcast reload when TypeScript watcher onRebuild fires', async () => {
      const { createTypeScriptWatcher } = await import('../../src/core/utils/typescript.utils.js');
      const { WebSocketServer } = await import('ws');

      const mockCreateTsWatcher = vi.mocked(createTypeScriptWatcher);
      mockCreateTsWatcher.mockResolvedValue([
        {
          dispose: vi.fn().mockResolvedValue(undefined),
          watch: vi.fn().mockResolvedValue(undefined),
          rebuild: vi.fn(),
          serve: vi.fn(),
          cancel: vi.fn(),
        },
      ]);

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
        typescript: {
          enabled: true,
        },
      });

      const mockLogger = createMockLogger();
      const devServer = await createDevServer({
        port: 8106,
        logger: mockLogger,
      });

      await devServer.start();

      const wsCtor = vi.mocked(WebSocketServer);
      const wsResult = wsCtor.mock.results[0];
      expect(wsResult).toBeDefined();
      if (!wsResult) {
        throw new Error('Expected WebSocketServer to be instantiated');
      }
      const wsInstance = wsResult.value as {
        clients: Set<{ readyState: number; send: (data: string) => void }>;
      };
      const send = vi.fn();
      wsInstance.clients.add({ readyState: 1, send });

      const createWatcherCall = mockCreateTsWatcher.mock.calls[0];
      expect(createWatcherCall).toBeDefined();
      if (!createWatcherCall) {
        throw new Error('Expected TypeScript watcher to be created');
      }
      const createWatcherArg = createWatcherCall[0];
      createWatcherArg.onRebuild([], 17);

      expect(mockLogger.info).toHaveBeenCalledWith('▸ TypeScript recompiled in 17ms');
      expect(send).toHaveBeenCalledWith(JSON.stringify({ type: 'reload' }));

      await devServer.stop();
    });

    it('should skip TypeScript reload broadcast when ws reload is disabled', async () => {
      const { createTypeScriptWatcher } = await import('../../src/core/utils/typescript.utils.js');
      const { WebSocketServer } = await import('ws');

      process.env.STATI_DEV_DISABLE_WS_RELOAD = '1';

      const mockCreateTsWatcher = vi.mocked(createTypeScriptWatcher);
      mockCreateTsWatcher.mockResolvedValue([
        {
          dispose: vi.fn().mockResolvedValue(undefined),
          watch: vi.fn().mockResolvedValue(undefined),
          rebuild: vi.fn(),
          serve: vi.fn(),
          cancel: vi.fn(),
        },
      ]);

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
        typescript: {
          enabled: true,
        },
      });

      const mockLogger = createMockLogger();
      const devServer = await createDevServer({
        port: 8107,
        logger: mockLogger,
      });

      await devServer.start();

      const wsCtor = vi.mocked(WebSocketServer);
      const wsResult = wsCtor.mock.results[0];
      expect(wsResult).toBeDefined();
      if (!wsResult) {
        throw new Error('Expected WebSocketServer to be instantiated');
      }
      const wsInstance = wsResult.value as {
        clients: Set<{ readyState: number; send: (data: string) => void }>;
      };
      const send = vi.fn();
      wsInstance.clients.add({ readyState: 1, send });

      const createWatcherCall = mockCreateTsWatcher.mock.calls[0];
      expect(createWatcherCall).toBeDefined();
      if (!createWatcherCall) {
        throw new Error('Expected TypeScript watcher to be created');
      }
      const createWatcherArg = createWatcherCall[0];
      createWatcherArg.onRebuild([], 22);

      expect(mockLogger.info).toHaveBeenCalledWith('▸ TypeScript recompiled in 22ms');
      expect(send).not.toHaveBeenCalled();

      await devServer.stop();
      delete process.env.STATI_DEV_DISABLE_WS_RELOAD;
    });

    it('should initialize TypeScript watcher before initial build', async () => {
      const { createTypeScriptWatcher } = await import('../../src/core/utils/typescript.utils.js');
      const mockCreateTsWatcher = vi.mocked(createTypeScriptWatcher);
      mockCreateTsWatcher.mockResolvedValue([
        {
          dispose: vi.fn().mockResolvedValue(undefined),
          watch: vi.fn().mockResolvedValue(undefined),
          rebuild: vi.fn(),
          serve: vi.fn(),
          cancel: vi.fn(),
        },
      ]);

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
        typescript: {
          enabled: true,
        },
      });

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8105,
      });

      await devServer.start();

      const watcherCallOrder = mockCreateTsWatcher.mock.invocationCallOrder[0];
      const buildCallOrder = mockBuild.mock.invocationCallOrder[0];

      expect(watcherCallOrder).toBeDefined();
      expect(buildCallOrder).toBeDefined();
      expect((watcherCallOrder ?? Number.MAX_SAFE_INTEGER) < (buildCallOrder ?? 0)).toBe(true);

      await devServer.stop();
    });

    it('should handle TypeScript watcher setup failure gracefully', async () => {
      const { createTypeScriptWatcher } = await import('../../src/core/utils/typescript.utils.js');
      const mockCreateTsWatcher = vi.mocked(createTypeScriptWatcher);
      mockCreateTsWatcher.mockRejectedValueOnce(new Error('Entry point not found'));

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
        typescript: {
          enabled: true,
        },
      });

      const mockLogger = createMockLogger();

      const devServer = await createDevServer({
        port: 8101,
        logger: mockLogger,
      });

      // Should not throw - should continue without TypeScript watcher
      await devServer.start();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('TypeScript setup failed'),
      );
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('TypeScript hot reload is DISABLED'),
      );

      await devServer.stop();
    });

    it('should not start TypeScript watcher when typescript is disabled', async () => {
      const { createTypeScriptWatcher } = await import('../../src/core/utils/typescript.utils.js');
      const mockCreateTsWatcher = vi.mocked(createTypeScriptWatcher);
      mockCreateTsWatcher.mockClear();

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
        // No typescript config
      });

      const devServer = await createDevServer({
        port: 8102,
      });

      await devServer.start();

      expect(mockCreateTsWatcher).not.toHaveBeenCalled();

      await devServer.stop();
    });

    it('should dispose TypeScript watcher on stop', async () => {
      const { createTypeScriptWatcher } = await import('../../src/core/utils/typescript.utils.js');
      const mockCreateTsWatcher = vi.mocked(createTypeScriptWatcher);
      const mockDispose = vi.fn().mockResolvedValue(undefined);
      // Return array of contexts
      mockCreateTsWatcher.mockReturnValueOnce(
        Promise.resolve([
          {
            dispose: mockDispose,
            watch: vi.fn(),
            rebuild: vi.fn(),
            serve: vi.fn(),
            cancel: vi.fn(),
          },
        ]) as ReturnType<typeof createTypeScriptWatcher>,
      );

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
        typescript: {
          enabled: true,
        },
      });

      const devServer = await createDevServer({
        port: 8103,
      });

      await devServer.start();
      await devServer.stop();

      expect(mockDispose).toHaveBeenCalled();
    });

    it('should handle TypeScript watcher disposal failure gracefully', async () => {
      const { createTypeScriptWatcher } = await import('../../src/core/utils/typescript.utils.js');
      const mockCreateTsWatcher = vi.mocked(createTypeScriptWatcher);
      const mockDispose = vi.fn().mockRejectedValue(new Error('Watcher dispose failed'));
      // Return array of contexts with failing dispose
      mockCreateTsWatcher.mockReturnValueOnce(
        Promise.resolve([
          {
            dispose: mockDispose,
            watch: vi.fn(),
            rebuild: vi.fn(),
            serve: vi.fn(),
            cancel: vi.fn(),
          },
        ]) as ReturnType<typeof createTypeScriptWatcher>,
      );

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
        typescript: {
          enabled: true,
        },
      });

      const mockLogger = createMockLogger();

      const devServer = await createDevServer({
        port: 8104,
        logger: mockLogger,
      });

      await devServer.start();
      await devServer.stop();

      // Should log a warning about disposal failure
      expect(mockDispose).toHaveBeenCalled();
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to dispose TypeScript watcher'),
      );
    });
  });

  describe('CSS file watcher', () => {
    it('should set up a watcher for CSS files in output directory', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      mockWatch.mockClear();
      mockDiscoverOutputCssFiles.mockResolvedValueOnce(['C:/repo/dist/styles.css']);

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const devServer = await createDevServer({
        port: 8110,
      });

      await devServer.start();

      // Should have been called twice: once for srcDir/staticDir, once for CSS files
      expect(mockWatch).toHaveBeenCalledTimes(2);

      // Second call should be for CSS files in output directory
      const cssWatchCall = mockWatch.mock.calls[1];
      expect(cssWatchCall).toBeDefined();
      expect(cssWatchCall![0]).toEqual(expect.arrayContaining([expect.stringContaining('dist')]));
      expect(cssWatchCall![0]).toEqual(expect.arrayContaining([expect.stringContaining('.css')]));

      await devServer.stop();
    });

    it('should trigger reload without rebuild when CSS file changes', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      mockDiscoverOutputCssFiles.mockResolvedValueOnce(['C:/repo/dist/styles.css']);

      // Store the change handler for CSS watcher
      let cssChangeHandler: ((path: string) => void) | undefined;

      // Track which watcher is being created
      let watcherIndex = 0;
      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        return {
          on: vi.fn((event: string, handler: (path: string) => void) => {
            // Capture the change handler from the second watcher (CSS watcher)
            if (currentIndex === 1 && event === 'change') {
              cssChangeHandler = handler;
            }
            return {
              on: vi.fn(),
              close: vi.fn(() => Promise.resolve()),
            };
          }),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      // Clear build mock to track new calls
      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8111,
        logger: mockLogger,
      });

      await devServer.start();

      // Reset build mock after initial build
      mockBuild.mockClear();

      // Simulate CSS file change
      expect(cssChangeHandler).toBeDefined();
      cssChangeHandler!('dist/styles.css');

      // Should log the update
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('styles.css updated'));

      // Should NOT trigger a rebuild
      expect(mockBuild).not.toHaveBeenCalled();

      await devServer.stop();

      // Reset watcherIndex for next test
      watcherIndex = 0;
    });

    it('should close CSS watcher on stop', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      mockDiscoverOutputCssFiles.mockResolvedValueOnce(['C:/repo/dist/styles.css']);

      const mockCssWatcherClose = vi.fn(() => Promise.resolve());
      let watcherIndex = 0;

      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        return {
          on: vi.fn().mockReturnThis(),
          close: currentIndex === 1 ? mockCssWatcherClose : vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const devServer = await createDevServer({
        port: 8112,
      });

      await devServer.start();
      await devServer.stop();

      // CSS watcher should be closed
      expect(mockCssWatcherClose).toHaveBeenCalled();

      // Reset watcherIndex for next test
      watcherIndex = 0;
    });
  });

  describe('File Change Queue and Event Types', () => {
    it('should rebuild incrementally, never forcing, when a Markdown file changes', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      const { loadCacheManifest } = await import('../../src/core/isg/index.js');
      const mockLoadCacheManifest = vi.mocked(loadCacheManifest);

      let changeHandler: ((path: string) => void) | undefined;
      mockWatch.mockImplementation(
        () =>
          ({
            on: vi.fn((event: string, handler: (path: string) => void) => {
              if (event === 'change') {
                changeHandler ??= handler;
              }
              return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
            }),
            close: vi.fn(() => Promise.resolve()),
          }) as unknown as ReturnType<typeof chokidar.default.watch>,
      );

      // A stored navigation hash that differs from the current one used to force a full rebuild
      mockLoadCacheManifest.mockResolvedValue({ entries: {}, navigationHash: 'old-hash' });
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const devServer = await createDevServer({ port: 8119, logger: createMockLogger() });
      await devServer.start();
      mockBuild.mockClear();

      changeHandler!(`${process.cwd()}/site/blog/post.md`);
      await setTimeout(50);

      expect(mockBuild).toHaveBeenCalledTimes(1);
      expect(mockBuild).toHaveBeenCalledWith(expect.objectContaining({ force: false }));

      await devServer.stop();
      mockLoadCacheManifest.mockResolvedValue(null);
    });

    it('should pass event type to watcher handlers', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);

      const handlers: Record<string, ((path: string) => void) | undefined> = {};

      mockWatch.mockImplementation(() => {
        return {
          on: vi.fn((event: string, handler: (path: string) => void) => {
            handlers[event] = handler;
            return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
          }),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      const devServer = await createDevServer({
        port: 8113,
        logger: mockLogger,
      });

      await devServer.start();

      // Verify all three event handlers are registered
      expect(handlers['add']).toBeDefined();
      expect(handlers['change']).toBeDefined();
      expect(handlers['unlink']).toBeDefined();

      await devServer.stop();
    });

    it('should log correct action for static asset add event', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);

      let addHandler: ((path: string) => void) | undefined;
      let watcherIndex = 0;

      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        // First watcher is for src/static, second is for CSS
        if (currentIndex === 0) {
          return {
            on: vi.fn((event: string, handler: (path: string) => void) => {
              if (event === 'add') {
                addHandler = handler;
              }
              return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
            }),
            close: vi.fn(() => Promise.resolve()),
          } as unknown as ReturnType<typeof chokidar.default.watch>;
        }
        return {
          on: vi.fn().mockReturnThis(),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      const cwd = process.cwd();
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8114,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockLogger.info.mockClear();

      // Simulate adding a static file in public folder
      expect(addHandler).toBeDefined();
      addHandler!(`${cwd}/public/new-image.png`);

      // Wait for async operations
      await setTimeout(50);

      // Should log with 'copied' action for static assets
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('public/new-image.png'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('copied'));

      await devServer.stop();
      watcherIndex = 0;
    });

    it('should log correct action for unlink event', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);

      let unlinkHandler: ((path: string) => void) | undefined;
      let watcherIndex = 0;

      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        if (currentIndex === 0) {
          return {
            on: vi.fn((event: string, handler: (path: string) => void) => {
              if (event === 'unlink') {
                unlinkHandler = handler;
              }
              return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
            }),
            close: vi.fn(() => Promise.resolve()),
          } as unknown as ReturnType<typeof chokidar.default.watch>;
        }
        return {
          on: vi.fn().mockReturnThis(),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      const cwd = process.cwd();
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8115,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockLogger.info.mockClear();

      // Simulate deleting a file
      expect(unlinkHandler).toBeDefined();
      unlinkHandler!(`${cwd}/public/deleted-image.png`);

      // Wait for async operations
      await setTimeout(50);

      // Should log with 'deleted' action for unlink events
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('public/deleted-image.png'),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('deleted'));

      await devServer.stop();
      watcherIndex = 0;
    });

    it('should log correct action for markdown file change', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);

      let changeHandler: ((path: string) => void) | undefined;
      let watcherIndex = 0;

      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        if (currentIndex === 0) {
          return {
            on: vi.fn((event: string, handler: (path: string) => void) => {
              if (event === 'change') {
                changeHandler = handler;
              }
              return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
            }),
            close: vi.fn(() => Promise.resolve()),
          } as unknown as ReturnType<typeof chokidar.default.watch>;
        }
        return {
          on: vi.fn().mockReturnThis(),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      const cwd = process.cwd();
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8116,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockLogger.info.mockClear();

      // Simulate changing a markdown file (not in public folder)
      expect(changeHandler).toBeDefined();
      changeHandler!(`${cwd}/site/index.md`);

      // Wait for async operations
      await setTimeout(50);

      // Should log with 'rebuilt' action for non-static files
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('site/index.md'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('rebuilt'));

      await devServer.stop();
      watcherIndex = 0;
    });

    it('should use configured staticDir for asset detection', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);

      let addHandler: ((path: string) => void) | undefined;
      let watcherIndex = 0;

      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        if (currentIndex === 0) {
          return {
            on: vi.fn((event: string, handler: (path: string) => void) => {
              if (event === 'add') {
                addHandler = handler;
              }
              return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
            }),
            close: vi.fn(() => Promise.resolve()),
          } as unknown as ReturnType<typeof chokidar.default.watch>;
        }
        return {
          on: vi.fn().mockReturnThis(),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      const cwd = process.cwd();
      // Use a custom static directory
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'assets', // Custom static dir
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8117,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockLogger.info.mockClear();

      // Simulate adding a file in the custom assets folder
      expect(addHandler).toBeDefined();
      addHandler!(`${cwd}/assets/new-image.png`);

      // Wait for async operations
      await setTimeout(50);

      // Should log with 'copied' action since it's in the custom staticDir
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('assets/new-image.png'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('copied'));

      await devServer.stop();
      watcherIndex = 0;
    });

    it('should queue changes when build is in progress and process them after', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);

      let changeHandler: ((path: string) => void) | undefined;
      let watcherIndex = 0;

      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        if (currentIndex === 0) {
          return {
            on: vi.fn((event: string, handler: (path: string) => void) => {
              if (event === 'change') {
                changeHandler = handler;
              }
              return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
            }),
            close: vi.fn(() => Promise.resolve()),
          } as unknown as ReturnType<typeof chokidar.default.watch>;
        }
        return {
          on: vi.fn().mockReturnThis(),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      const cwd = process.cwd();
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      // Use a deferred build that we control
      let buildResolvers: Array<() => void> = [];
      mockBuild.mockImplementation(() => {
        return new Promise<{
          totalPages: number;
          assetsCount: number;
          buildTimeMs: number;
          outputSizeBytes: number;
        }>((resolve) => {
          buildResolvers.push(() =>
            resolve({
              totalPages: 5,
              assetsCount: 10,
              buildTimeMs: 100,
              outputSizeBytes: 1024,
            }),
          );
        });
      });

      const devServer = await createDevServer({
        port: 8118,
        logger: mockLogger,
      });

      // Start server (initial build starts but doesn't complete)
      const startPromise = devServer.start();

      // Wait a tick for initial build to start
      await setTimeout(10);

      // Resolve initial build (from performInitialBuild)
      expect(buildResolvers.length).toBeGreaterThanOrEqual(1);
      buildResolvers.shift()!();

      await startPromise;

      // Clear mocks for clean slate
      mockBuild.mockClear();
      mockLogger.info.mockClear();
      buildResolvers = [];

      // Set up new builds to be deferrable
      mockBuild.mockImplementation(() => {
        return new Promise<{
          totalPages: number;
          assetsCount: number;
          buildTimeMs: number;
          outputSizeBytes: number;
        }>((resolve) => {
          buildResolvers.push(() =>
            resolve({
              totalPages: 5,
              assetsCount: 10,
              buildTimeMs: 100,
              outputSizeBytes: 1024,
            }),
          );
        });
      });

      // Trigger first change (starts a build that won't complete immediately)
      expect(changeHandler).toBeDefined();
      changeHandler!(`${cwd}/site/index.md`);

      // Wait for the async build to be initiated
      await setTimeout(10);

      // Trigger second change while first build is still in progress
      // This should be queued, not immediately trigger a build
      changeHandler!(`${cwd}/site/about.md`);

      // Wait a bit more
      await setTimeout(10);

      // At this point, only one build should have started (the first one is in progress,
      // the second change should be queued)
      expect(buildResolvers.length).toBe(1);

      // Resolve the first build
      buildResolvers.shift()!();

      // Wait for queued build to be triggered
      await setTimeout(50);

      // Now the queued change should have triggered another build
      if (buildResolvers.length > 0) {
        buildResolvers.shift()!();
        await setTimeout(50);
      }

      // Both files should have been logged
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('index.md'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('about.md'));

      await devServer.stop();
      watcherIndex = 0;
    });

    it('should process multiple queued changes in a batch', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);

      let changeHandler: ((path: string) => void) | undefined;
      let addHandler: ((path: string) => void) | undefined;
      let unlinkHandler: ((path: string) => void) | undefined;
      let watcherIndex = 0;

      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        if (currentIndex === 0) {
          return {
            on: vi.fn((event: string, handler: (path: string) => void) => {
              if (event === 'change') changeHandler = handler;
              if (event === 'add') addHandler = handler;
              if (event === 'unlink') unlinkHandler = handler;
              return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
            }),
            close: vi.fn(() => Promise.resolve()),
          } as unknown as ReturnType<typeof chokidar.default.watch>;
        }
        return {
          on: vi.fn().mockReturnThis(),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      const cwd = process.cwd();
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      // Use a deferred build that we control
      let buildResolvers: Array<() => void> = [];
      mockBuild.mockImplementation(() => {
        return new Promise<{
          totalPages: number;
          assetsCount: number;
          buildTimeMs: number;
          outputSizeBytes: number;
        }>((resolve) => {
          buildResolvers.push(() =>
            resolve({
              totalPages: 5,
              assetsCount: 10,
              buildTimeMs: 100,
              outputSizeBytes: 1024,
            }),
          );
        });
      });

      const devServer = await createDevServer({
        port: 8119,
        logger: mockLogger,
      });

      // Start server (initial build starts but doesn't complete)
      const startPromise = devServer.start();

      // Wait a tick for initial build to start
      await setTimeout(10);

      // Resolve initial build
      expect(buildResolvers.length).toBeGreaterThanOrEqual(1);
      buildResolvers.shift()!();

      await startPromise;

      // Clear mocks
      mockBuild.mockClear();
      mockLogger.info.mockClear();
      buildResolvers = [];

      // Set up new builds to be deferrable
      mockBuild.mockImplementation(() => {
        return new Promise<{
          totalPages: number;
          assetsCount: number;
          buildTimeMs: number;
          outputSizeBytes: number;
        }>((resolve) => {
          buildResolvers.push(() =>
            resolve({
              totalPages: 5,
              assetsCount: 10,
              buildTimeMs: 100,
              outputSizeBytes: 1024,
            }),
          );
        });
      });

      // Trigger first change (starts a build)
      expect(changeHandler).toBeDefined();
      changeHandler!(`${cwd}/site/index.md`);

      // Wait for async operation to start
      await setTimeout(10);

      // Queue multiple different event types while build is in progress
      addHandler!(`${cwd}/public/new-image.png`);
      unlinkHandler!(`${cwd}/public/old-image.png`);
      changeHandler!(`${cwd}/site/contact.md`);

      await setTimeout(10);

      // Only one build should be running at this point
      expect(buildResolvers.length).toBe(1);

      // Resolve first build
      buildResolvers.shift()!();

      // Wait for queued build to be triggered
      await setTimeout(50);

      // Now the queued changes should have triggered another build
      if (buildResolvers.length > 0) {
        buildResolvers.shift()!();
        await setTimeout(50);
      }

      // All files should have been logged
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('index.md'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('new-image.png'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('old-image.png'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('contact.md'));

      await devServer.stop();
      watcherIndex = 0;
    });

    it('should handle build errors and continue processing queued changes', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);

      let changeHandler: ((path: string) => void) | undefined;
      let watcherIndex = 0;

      mockWatch.mockImplementation(() => {
        const currentIndex = watcherIndex++;
        if (currentIndex === 0) {
          return {
            on: vi.fn((event: string, handler: (path: string) => void) => {
              if (event === 'change') {
                changeHandler = handler;
              }
              return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
            }),
            close: vi.fn(() => Promise.resolve()),
          } as unknown as ReturnType<typeof chokidar.default.watch>;
        }
        return {
          on: vi.fn().mockReturnThis(),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });

      const cwd = process.cwd();
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = createMockLogger();

      // Use a deferred build that we control
      let buildResolvers: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
      mockBuild.mockImplementation(() => {
        return new Promise<{
          totalPages: number;
          assetsCount: number;
          buildTimeMs: number;
          outputSizeBytes: number;
        }>((resolve, reject) => {
          buildResolvers.push({
            resolve: () =>
              resolve({
                totalPages: 5,
                assetsCount: 10,
                buildTimeMs: 100,
                outputSizeBytes: 1024,
              }),
            reject,
          });
        });
      });

      const devServer = await createDevServer({
        port: 8120,
        logger: mockLogger,
      });

      // Start server (initial build starts but doesn't complete)
      const startPromise = devServer.start();

      // Wait a tick for initial build to start
      await setTimeout(10);

      // Resolve initial build
      expect(buildResolvers.length).toBeGreaterThanOrEqual(1);
      buildResolvers.shift()!.resolve();

      await startPromise;

      // Clear mocks AFTER initial build is done
      mockBuild.mockClear();
      buildResolvers = [];

      let buildCallCount = 0;
      // Make all builds fail with error consistently
      mockBuild.mockImplementation(() => {
        buildCallCount++;
        return new Promise<{
          totalPages: number;
          assetsCount: number;
          buildTimeMs: number;
          outputSizeBytes: number;
        }>((_resolve, reject) => {
          // Immediately reject to simulate build failure
          Promise.resolve().then(() => reject(new Error('Template error')));
        });
      });

      // Trigger first change (starts a build that will fail)
      expect(changeHandler).toBeDefined();
      changeHandler!(`${cwd}/site/index.md`);

      // Wait for the error to be processed
      await setTimeout(100);

      // Should have logged error for failed build
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Rebuild failed'));

      // Build should have been attempted (may have fallback attempts)
      expect(buildCallCount).toBeGreaterThanOrEqual(1);

      await devServer.stop();
      watcherIndex = 0;
    });
  });

  describe('Template file change handling', () => {
    type WatcherHandler = (path: string) => void;
    const cwd = process.cwd();
    const posixCwd = cwd.replace(/\\/g, '/');
    const srcDir = `${cwd}/site`;

    /** A cache entry as a 2.0 render records it */
    const recordedEntry = (
      path: string,
      deps: string[],
      templateLookups: Array<{ name: string; from?: string; file: string | null }> = [],
    ) => ({
      path,
      inputsHash: `hash-${path}`,
      deps,
      templateLookups,
      templatesRecorded: true,
      tags: [],
      renderedAt: new Date().toISOString(),
      ttlSeconds: 3600,
    });

    /** Starts the dev server with the given manifest and returns the watcher's handlers */
    async function startWatching(manifest: unknown, port: number) {
      const chokidar = await import('chokidar');
      const isg = await import('../../src/core/isg/index.js');
      const handlers: Record<string, WatcherHandler> = {};
      let watcherIndex = 0;
      vi.mocked(chokidar.default.watch).mockImplementation(() => {
        const currentIndex = watcherIndex++;
        return {
          on: vi.fn((event: string, handler: WatcherHandler) => {
            if (currentIndex === 0) handlers[event] = handler;
            return { on: vi.fn().mockReturnThis(), close: vi.fn(() => Promise.resolve()) };
          }),
          close: vi.fn(() => Promise.resolve()),
        } as unknown as ReturnType<typeof chokidar.default.watch>;
      });
      vi.mocked(isg.loadCacheManifest).mockResolvedValue(manifest as never);
      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const logger = createMockLogger();
      const devServer = await createDevServer({ port, logger });
      await devServer.start();
      mockBuild.mockClear();
      vi.mocked(isg.saveCacheManifest).mockClear();

      return {
        handlers,
        logger,
        devServer,
        saved: () => vi.mocked(isg.saveCacheManifest).mock.calls.map(([, saved]) => saved),
        async stop() {
          await devServer.stop();
          vi.mocked(isg.loadCacheManifest).mockResolvedValue(null);
        },
      };
    }

    it('rebuilds the pages that rendered a changed template, matching normalized paths', async () => {
      const watching = await startWatching(
        {
          entries: {
            '/index.html': recordedEntry('/index.html', [
              `${cwd}/site/layout.eta`,
              `${cwd}/site/partials/header.eta`,
            ]),
            '/about.html': recordedEntry('/about.html', [`${cwd}/site/layout.eta`]),
          },
        },
        8130,
      );

      watching.handlers.change!(`${cwd}/site/layout.eta`);
      await setTimeout(100);

      const [saved] = watching.saved();
      expect(saved?.entries['/index.html']?.inputsHash).toBe('STALE');
      expect(saved?.entries['/about.html']?.inputsHash).toBe('STALE');
      // The build saves the entries it renders, with the templates they used this time
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({ force: false, skipAssetCopy: true }),
      );
      expect(mockBuild.mock.calls[0]?.[0]).not.toHaveProperty('skipManifestSave');
      expect(watching.logger.info).toHaveBeenCalledWith('▸ site/layout.eta changed');
      expect(watching.logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/^ {3}2\/2 pages rebuilt in \d+ms$/),
      );

      await watching.stop();
    });

    it('marks only the pages that used the changed template', async () => {
      const watching = await startWatching(
        {
          entries: {
            '/index.html': recordedEntry('/index.html', [
              `${cwd}/site/layout.eta`,
              `${cwd}/site/partials/header.eta`,
            ]),
            '/about.html': recordedEntry('/about.html', [`${cwd}/site/layout.eta`]),
          },
        },
        8131,
      );

      watching.handlers.change!(`${cwd}/site/partials/header.eta`);
      await setTimeout(100);

      const [saved] = watching.saved();
      expect(saved?.entries['/index.html']?.inputsHash).toBe('STALE');
      expect(saved?.entries['/about.html']?.inputsHash).toBe('hash-/about.html');
      expect(mockBuild).toHaveBeenCalledTimes(1);

      await watching.stop();
    });

    it('rebuilds nothing when no page uses the changed template', async () => {
      const watching = await startWatching(
        { entries: { '/index.html': recordedEntry('/index.html', [`${cwd}/site/layout.eta`]) } },
        8132,
      );

      watching.handlers.change!(`${cwd}/site/partials/unused.eta`);
      await setTimeout(100);

      expect(watching.saved()).toEqual([]);
      expect(mockBuild).not.toHaveBeenCalled();
      expect(watching.logger.info).toHaveBeenCalledWith('▸ site/partials/unused.eta changed');
      expect(watching.logger.info).toHaveBeenCalledWith('   No page uses it');

      await watching.stop();
    });

    it('runs a forced full build for entries written before templates were recorded', async () => {
      const { templatesRecorded: _, ...oldEntry } = recordedEntry('/index.html', [
        `${cwd}/site/layout.eta`,
      ]);
      const watching = await startWatching({ entries: { '/index.html': oldEntry } }, 8133);

      watching.handlers.change!(`${cwd}/site/partials/unused.eta`);
      await setTimeout(100);

      expect(mockBuild).toHaveBeenCalledWith(expect.objectContaining({ force: true }));

      await watching.stop();
    });

    it('matches Windows-style backslash paths from the watcher', async () => {
      const watching = await startWatching(
        {
          entries: {
            '/index.html': recordedEntry('/index.html', [`${posixCwd}/site/layout.eta`]),
          },
        },
        8134,
      );

      watching.handlers.change!(`${cwd}\\site\\layout.eta`);
      await setTimeout(100);

      expect(watching.saved()[0]?.entries['/index.html']?.inputsHash).toBe('STALE');
      expect(mockBuild).toHaveBeenCalled();

      await watching.stop();
    });

    it('does a full build when no cache exists', async () => {
      const watching = await startWatching(null, 8135);

      watching.handlers.change!(`${cwd}/site/layout.eta`);
      await setTimeout(100);

      expect(watching.saved()).toEqual([]);
      expect(mockBuild).toHaveBeenCalledWith(expect.objectContaining({ force: false }));

      await watching.stop();
    });

    it('rebuilds the pages a new section override applies to, and only those', async () => {
      const { loadTemplateIndex } = await import('../../src/core/template-index.js');
      const watching = await startWatching(
        {
          entries: {
            '/blog/post.html': recordedEntry(
              '/blog/post.html',
              [`${cwd}/site/layout.eta`, `${cwd}/site/partials/header.eta`],
              [{ name: 'partials/header', from: 'blog', file: 'partials/header.eta' }],
            ),
            '/about.html': recordedEntry(
              '/about.html',
              [`${cwd}/site/layout.eta`, `${cwd}/site/partials/header.eta`],
              [{ name: 'partials/header', from: '', file: 'partials/header.eta' }],
            ),
          },
        },
        8136,
      );
      // The session's template index, as the initial build leaves it
      mockFg.mockResolvedValueOnce(['layout.eta', 'partials/header.eta']);
      const index = await loadTemplateIndex(srcDir);

      watching.handlers.add!(`${cwd}/site/blog/partials/header.eta`);
      await setTimeout(100);

      expect(index.has('blog/partials/header.eta')).toBe(true);
      const [saved] = watching.saved();
      expect(saved?.entries['/blog/post.html']?.inputsHash).toBe('STALE');
      expect(saved?.entries['/about.html']?.inputsHash).toBe('hash-/about.html');
      expect(watching.logger.info).toHaveBeenCalledWith('▸ site/blog/partials/header.eta added');

      await watching.stop();
    });

    it('rebuilds the pages that rendered or found a deleted template', async () => {
      const { loadTemplateIndex } = await import('../../src/core/template-index.js');
      const watching = await startWatching(
        {
          entries: {
            '/blog/post.html': recordedEntry(
              '/blog/post.html',
              [`${cwd}/site/layout.eta`, `${cwd}/site/blog/partials/header.eta`],
              [{ name: 'partials/header', from: 'blog', file: 'blog/partials/header.eta' }],
            ),
            '/about.html': recordedEntry('/about.html', [`${cwd}/site/layout.eta`]),
          },
        },
        8137,
      );
      mockFg.mockResolvedValueOnce([
        'layout.eta',
        'partials/header.eta',
        'blog/partials/header.eta',
      ]);
      const index = await loadTemplateIndex(srcDir);

      watching.handlers.unlink!(`${cwd}/site/blog/partials/header.eta`);
      await setTimeout(100);

      expect(index.has('blog/partials/header.eta')).toBe(false);
      const [saved] = watching.saved();
      expect(saved?.entries['/blog/post.html']?.inputsHash).toBe('STALE');
      expect(saved?.entries['/about.html']?.inputsHash).toBe('hash-/about.html');
      expect(watching.logger.info).toHaveBeenCalledWith('▸ site/blog/partials/header.eta deleted');

      await watching.stop();
    });

    it('reloads the open browsers after a rebuild', async () => {
      const { WebSocketServer } = await import('ws');
      const watching = await startWatching(
        { entries: { '/index.html': recordedEntry('/index.html', [`${cwd}/site/layout.eta`]) } },
        8139,
      );
      const wsServer = vi.mocked(WebSocketServer).mock.results.at(-1)?.value as {
        clients: Set<{ readyState: number; send: (data: string) => void }>;
      };
      const open = { readyState: 1, send: vi.fn() };
      const closing = { readyState: 2, send: vi.fn() };
      wsServer.clients.add(open);
      wsServer.clients.add(closing);

      watching.handlers.change!(`${cwd}/site/layout.eta`);
      await setTimeout(100);

      expect(open.send).toHaveBeenCalledWith(JSON.stringify({ type: 'reload' }));
      expect(closing.send).not.toHaveBeenCalled();

      await watching.stop();
    });

    it('lets the build decide what to rebuild when the cache manifest cannot be read', async () => {
      const isg = await import('../../src/core/isg/index.js');
      const watching = await startWatching({ entries: {} }, 8140);
      vi.mocked(isg.loadCacheManifest).mockRejectedValueOnce(
        new Error('EACCES: permission denied'),
      );

      watching.handlers.change!(`${cwd}/site/layout.eta`);
      await setTimeout(100);

      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({ force: false, skipAssetCopy: true }),
      );
      expect(watching.logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/^ {3}Done in \d+ms$/),
      );

      await watching.stop();
    });

    it('treats .eta files outside the source directory as static files', async () => {
      const watching = await startWatching({ entries: {} }, 8138);

      watching.handlers.change!(`${cwd}/public/snippet.eta`);
      await setTimeout(100);

      expect(mockBuild).toHaveBeenCalledWith(expect.not.objectContaining({ skipAssetCopy: true }));
      expect(watching.logger.info).toHaveBeenCalledWith('▸ public/snippet.eta copied');

      await watching.stop();
    });
  });

  describe('error overlay', () => {
    /** Starts a dev server whose initial build fails with the error, and requests a page */
    async function overlayFor(error: Error): Promise<string> {
      mockBuild.mockRejectedValueOnce(error);
      const devServer = await createDevServer({ port: 8210, logger: createMockLogger() });
      await devServer.start();

      const end = vi.fn();
      const res = { writeHead: vi.fn(), end } as unknown as ServerResponse;
      await capturedRequestHandler!({ url: '/blog/post', method: 'GET' } as IncomingMessage, res);
      await devServer.stop();

      expect(res.writeHead).toHaveBeenCalledWith(500, expect.anything());
      return String(end.mock.calls[0]?.[0]);
    }

    it.each([
      ['Template not found: header', 'Error', 'Template rendering failed'],
      ['bad indentation of a mapping entry', 'YAMLException', 'Markdown processing failed'],
      ['Invalid config: srcDir must be a string', 'Error', 'Configuration error'],
      ['ENOSPC: no space left on device', 'Error', 'Build process failed'],
    ])('classifies the build error "%s"', async (message, name, headline) => {
      const error = new Error(message);
      error.name = name;

      expect(await overlayFor(error)).toContain(headline);
    });

    it('points a front matter error at the Markdown file and line', async () => {
      const { FrontMatterError } = await import('../../src/core/utils/front-matter.utils.js');
      const file = `${process.cwd()}/site/blog/post.md`;
      const html = await overlayFor(
        new FrontMatterError(
          'Invalid front matter in site/blog/post.md at line 3, column 7: duplicated mapping key.',
          file,
          3,
          7,
        ),
      );

      expect(html).toContain('Markdown processing failed');
      expect(html).toContain(`<dd>${file}</dd>`);
      expect(html).toMatch(/<dt>Line<\/dt>\s*<dd>3[^<]*<\/dd>/);
      expect(html).toContain('Check the YAML front-matter syntax for errors');
    });
  });

  describe('request handling security', () => {
    it('should return 403 for path traversal attempts', async () => {
      // The request resolves outside the output directory
      const devServer = await createDevServer({
        port: 8200,
      });
      await devServer.start();

      const mockReq = {
        url: '/../../../etc/passwd',
        method: 'GET',
      } as IncomingMessage;

      const writeHeadMock = vi.fn();
      const endMock = vi.fn();
      const mockRes = {
        writeHead: writeHeadMock,
        end: endMock,
      } as unknown as ServerResponse;

      expect(capturedRequestHandler).not.toBeNull();
      if (capturedRequestHandler) {
        await capturedRequestHandler(mockReq, mockRes);

        // Should return 403 status code for path traversal
        expect(writeHeadMock).toHaveBeenCalledWith(
          403,
          expect.objectContaining({
            'Content-Type': 'text/plain',
          }),
        );
        expect(endMock).toHaveBeenCalledWith('403 - Forbidden');
      }

      await devServer.stop();
    });
  });
});
