import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPreviewServer } from '../../core/preview.js';
import type { PreviewServerOptions } from '../../core/preview.js';
import { loadConfig } from '../../config/loader.js';

// Mock dependencies
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

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../config/loader.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    srcDir: 'site',
    outDir: 'dist',
    staticDir: 'public',
    site: { title: 'Test Site', baseUrl: 'http://localhost:4000' },
  }),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('<html><body>Test</body></html>'),
  stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
}));

describe('Preview Server', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockLoadConfig = vi.mocked(loadConfig);

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();

    // Ensure mocks return valid data
    mockLoadConfig.mockResolvedValue({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:4000' },
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create preview server with default options', async () => {
    const previewServer = await createPreviewServer();

    expect(previewServer).toBeDefined();
    expect(previewServer.url).toBe('http://localhost:4000');
    expect(typeof previewServer.start).toBe('function');
    expect(typeof previewServer.stop).toBe('function');
  });

  it('should create preview server with custom options', async () => {
    const options: PreviewServerOptions = {
      port: 4000,
      host: '127.0.0.1',
      open: true,
      configPath: './custom.config.js',
    };

    const previewServer = await createPreviewServer(options);

    expect(previewServer).toBeDefined();
    expect(previewServer.url).toBe('http://127.0.0.1:4000');
  });

  it('should start and stop preview server', async () => {
    const previewServer = await createPreviewServer();

    await expect(previewServer.start()).resolves.toBeUndefined();
    await expect(previewServer.stop()).resolves.toBeUndefined();
  });

  it('should load configuration correctly', async () => {
    const options: PreviewServerOptions = {
      configPath: './custom.config.js',
    };

    await createPreviewServer(options);

    expect(mockLoadConfig).toHaveBeenCalledWith(process.cwd());
  });

  it('should handle configuration loading errors', async () => {
    mockLoadConfig.mockRejectedValueOnce(new Error('Config not found'));

    await expect(createPreviewServer()).rejects.toThrow('Config not found');
  });
});
