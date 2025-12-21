import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setTimeout } from 'node:timers/promises';
import { createDevServer } from '../../src/core/dev.js';
import type { DevServerOptions } from '../../src/core/dev.js';
import { loadConfig } from '../../src/config/loader.js';
import { build } from '../../src/core/build.js';
import { invalidate } from '../../src/core/invalidate.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Store the request handler for testing
let capturedRequestHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

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
  createServer: vi.fn((handler: (req: IncomingMessage, res: ServerResponse) => void) => {
    capturedRequestHandler = handler;
    return {
      listen: vi.fn((port: number, host: string, callback?: () => void) => {
        if (callback) callback();
      }),
      close: vi.fn((callback?: () => void) => {
        if (callback) callback();
      }),
      on: vi.fn(),
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

describe('Development Server', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockLoadConfig = vi.mocked(loadConfig);
  const mockBuild = vi.mocked(build);
  const mockInvalidate = vi.mocked(invalidate);

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
    capturedRequestHandler = null;

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
    expect(mockLogger.info).toHaveBeenCalledWith('▸ Clearing cache for fresh development build...');

    await devServer.stop();
  });

  it('should handle build errors during initial startup', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };

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
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };

    mockLoadConfig.mockRejectedValueOnce(new Error('Config file not found'));

    const options: DevServerOptions = {
      port: 8083,
      logger: mockLogger,
      configPath: './custom.config.js',
    };

    await expect(createDevServer(options)).rejects.toThrow('Config file not found');
  });

  it('should handle custom config path', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };

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
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

      const devServer = await createDevServer({
        port: 8100,
        logger: mockLogger,
      });

      await devServer.start();

      expect(mockCreateTsWatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          config: { enabled: true },
        }),
      );

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

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

  describe('Template file change handling with path normalization', () => {
    it('should use path normalization when matching template dependencies', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      const { loadCacheManifest, saveCacheManifest } = await import('../../src/core/isg/index.js');
      const mockLoadCacheManifest = vi.mocked(loadCacheManifest);
      const mockSaveCacheManifest = vi.mocked(saveCacheManifest);

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

      // Mock a cache manifest with template dependencies that use absolute paths
      // This simulates what the cache would look like after an initial build
      mockLoadCacheManifest.mockResolvedValue({
        entries: {
          '/index.html': {
            path: '/index.html',
            inputsHash: 'hash1',
            deps: [`${cwd}/site/layout.eta`, `${cwd}/site/_partials/header.eta`],
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
          '/about.html': {
            path: '/about.html',
            inputsHash: 'hash2',
            deps: [`${cwd}/site/layout.eta`],
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      });

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8130,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockSaveCacheManifest.mockClear();

      // Simulate changing a template file (layout.eta)
      expect(changeHandler).toBeDefined();
      changeHandler!(`${cwd}/site/layout.eta`);

      // Wait for async operations
      await setTimeout(100);

      // Cache manifest should have been loaded
      expect(mockLoadCacheManifest).toHaveBeenCalled();

      // Since layout.eta is a dependency of both pages, saveCacheManifest should be called
      // after removing affected entries
      expect(mockSaveCacheManifest).toHaveBeenCalled();

      // Build should have been triggered
      expect(mockBuild).toHaveBeenCalled();

      await devServer.stop();
      watcherIndex = 0;

      // Reset mock to default
      mockLoadCacheManifest.mockResolvedValue(null);
    });

    it('should handle template change when only specific pages are affected', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      const { loadCacheManifest, saveCacheManifest } = await import('../../src/core/isg/index.js');
      const mockLoadCacheManifest = vi.mocked(loadCacheManifest);
      const mockSaveCacheManifest = vi.mocked(saveCacheManifest);

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

      // Mock cache where header.eta is only used by index.html
      mockLoadCacheManifest.mockResolvedValue({
        entries: {
          '/index.html': {
            path: '/index.html',
            inputsHash: 'hash1',
            deps: [`${cwd}/site/layout.eta`, `${cwd}/site/_partials/header.eta`],
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
          '/about.html': {
            path: '/about.html',
            inputsHash: 'hash2',
            deps: [`${cwd}/site/layout.eta`], // No header dependency
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      });

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8131,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockSaveCacheManifest.mockClear();

      // Simulate changing the header partial (only affects index.html)
      expect(changeHandler).toBeDefined();
      changeHandler!(`${cwd}/site/_partials/header.eta`);

      // Wait for async operations
      await setTimeout(100);

      // Cache manifest should have been saved with /about.html still present
      expect(mockSaveCacheManifest).toHaveBeenCalled();

      // Check that the saved manifest still contains /about.html
      const savedManifest = mockSaveCacheManifest.mock.calls[0]?.[1];
      expect(savedManifest?.entries['/about.html']).toBeDefined();

      // Build should have been called for incremental rebuild
      expect(mockBuild).toHaveBeenCalled();

      await devServer.stop();
      watcherIndex = 0;

      // Reset mock to default
      mockLoadCacheManifest.mockResolvedValue(null);
    });

    it('should force full rebuild when template change affects no cached pages', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      const { loadCacheManifest, saveCacheManifest } = await import('../../src/core/isg/index.js');
      const mockLoadCacheManifest = vi.mocked(loadCacheManifest);
      const mockSaveCacheManifest = vi.mocked(saveCacheManifest);

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

      // Mock cache where a different template is used
      mockLoadCacheManifest.mockResolvedValue({
        entries: {
          '/index.html': {
            path: '/index.html',
            inputsHash: 'hash1',
            deps: [`${cwd}/site/layout.eta`], // No footer dependency
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      });

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8132,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockSaveCacheManifest.mockClear();

      // Simulate changing a footer template that no cached page depends on
      expect(changeHandler).toBeDefined();
      changeHandler!(`${cwd}/site/_partials/footer.eta`);

      // Wait for async operations
      await setTimeout(100);

      // saveCacheManifest should NOT be called (no entries were modified)
      expect(mockSaveCacheManifest).not.toHaveBeenCalled();

      // Build should have been called with force: true (full rebuild)
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          force: true,
        }),
      );

      await devServer.stop();
      watcherIndex = 0;

      // Reset mock to default
      mockLoadCacheManifest.mockResolvedValue(null);
    });

    it('should handle path normalization with Windows-style backslashes', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      const { loadCacheManifest, saveCacheManifest } = await import('../../src/core/isg/index.js');
      const mockLoadCacheManifest = vi.mocked(loadCacheManifest);
      const mockSaveCacheManifest = vi.mocked(saveCacheManifest);

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

      // Mock cache with POSIX-style paths (as they would be stored)
      const posixCwd = cwd.replace(/\\/g, '/');
      mockLoadCacheManifest.mockResolvedValue({
        entries: {
          '/index.html': {
            path: '/index.html',
            inputsHash: 'hash1',
            deps: [`${posixCwd}/site/layout.eta`],
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      });

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8133,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockSaveCacheManifest.mockClear();

      // Simulate file watcher providing Windows-style path (with backslashes)
      expect(changeHandler).toBeDefined();
      const windowsStylePath = `${cwd}\\site\\layout.eta`;
      changeHandler!(windowsStylePath);

      // Wait for async operations
      await setTimeout(100);

      // Path normalization should make the paths match
      // saveCacheManifest should be called since a matching dependency was found
      expect(mockSaveCacheManifest).toHaveBeenCalled();

      // Build should have been triggered for incremental rebuild
      expect(mockBuild).toHaveBeenCalled();

      await devServer.stop();
      watcherIndex = 0;

      // Reset mock to default
      mockLoadCacheManifest.mockResolvedValue(null);
    });

    it('should do full rebuild when no cache exists for template change', async () => {
      const chokidar = await import('chokidar');
      const mockWatch = vi.mocked(chokidar.default.watch);
      const { loadCacheManifest, saveCacheManifest } = await import('../../src/core/isg/index.js');
      const mockLoadCacheManifest = vi.mocked(loadCacheManifest);
      const mockSaveCacheManifest = vi.mocked(saveCacheManifest);

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

      // Mock no cache (returns null)
      mockLoadCacheManifest.mockResolvedValue(null);

      mockLoadConfig.mockResolvedValueOnce({
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
      });

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        building: vi.fn(),
        processing: vi.fn(),
        stats: vi.fn(),
      };

      mockBuild.mockClear();

      const devServer = await createDevServer({
        port: 8134,
        logger: mockLogger,
      });

      await devServer.start();
      mockBuild.mockClear();
      mockSaveCacheManifest.mockClear();

      // Simulate changing a template file when no cache exists
      expect(changeHandler).toBeDefined();
      changeHandler!(`${cwd}/site/layout.eta`);

      // Wait for async operations
      await setTimeout(100);

      // saveCacheManifest should NOT be called (no cache to update)
      expect(mockSaveCacheManifest).not.toHaveBeenCalled();

      // Build should have been called (full rebuild since no cache)
      expect(mockBuild).toHaveBeenCalled();

      await devServer.stop();
      watcherIndex = 0;
    });
  });

  describe('request handling security', () => {
    it('should return 403 for path traversal attempts', async () => {
      // Get the mocked isPathWithinDirectory and configure it to reject the path
      const { isPathWithinDirectory } = await import('../../src/core/utils/paths.utils.js');
      vi.mocked(isPathWithinDirectory).mockReturnValue(false);

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
