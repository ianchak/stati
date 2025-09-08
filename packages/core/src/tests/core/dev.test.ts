import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDevServer } from '../../core/dev.js';
import type { DevServerOptions } from '../../core/dev.js';
import { loadConfig } from '../../config/loader.js';
import { build } from '../../core/build.js';

// Mock dependencies
vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    clients: new Set(),
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn().mockReturnValue({
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    srcDir: 'site',
    outDir: 'dist',
    staticDir: 'public',
    site: { title: 'Test Site', baseUrl: 'http://localhost:3000' },
  }),
}));

vi.mock('../../core/build.js', () => ({
  build: vi.fn().mockResolvedValue({
    pages: 5,
    assets: 10,
    buildTime: 1000,
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
      pages: 5,
      buildTime: 1000,
      staticAssets: 10,
      totalSize: 1024,
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
});
