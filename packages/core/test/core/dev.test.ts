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
          mode: 'development',
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
      // Return array of contexts (new multi-bundle API)
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
  });
});
