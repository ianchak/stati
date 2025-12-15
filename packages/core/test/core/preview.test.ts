import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPreviewServer } from '../../src/core/preview.js';
import type { PreviewServerOptions } from '../../src/core/preview.js';
import { loadConfig } from '../../src/config/loader.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Store the request handler for testing
let capturedRequestHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

// Mock dependencies
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

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/config/loader.js', () => ({
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
    capturedRequestHandler = null;

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

  it('should use preview config values from config file', async () => {
    // Mock config with preview settings
    mockLoadConfig.mockResolvedValueOnce({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:4000' },
      preview: {
        port: 5000,
        host: '0.0.0.0',
        open: true,
      },
    });

    const previewServer = await createPreviewServer();

    expect(previewServer).toBeDefined();
    expect(previewServer.url).toBe('http://0.0.0.0:5000');
  });

  it('should override config values with programmatic options', async () => {
    // Mock config with preview settings
    mockLoadConfig.mockResolvedValueOnce({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:4000' },
      preview: {
        port: 5000,
        host: '0.0.0.0',
        open: true,
      },
    });

    // Programmatic options should override config
    const options: PreviewServerOptions = {
      port: 6000,
      host: '127.0.0.1',
    };

    const previewServer = await createPreviewServer(options);

    expect(previewServer).toBeDefined();
    expect(previewServer.url).toBe('http://127.0.0.1:6000');
  });

  it('should use defaults when no config and no options provided', async () => {
    mockLoadConfig.mockResolvedValueOnce({
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test Site', baseUrl: 'http://localhost:4000' },
      // No preview config
    });

    const previewServer = await createPreviewServer();

    expect(previewServer).toBeDefined();
    expect(previewServer.url).toBe('http://localhost:4000'); // DEFAULT_DEV_HOST:DEFAULT_PREVIEW_PORT
  });

  describe('request handling', () => {
    it('should set no-cache Cache-Control header on responses', async () => {
      const previewServer = await createPreviewServer();
      await previewServer.start();

      // Create mock request and response objects
      const mockReq = {
        url: '/index.html',
        method: 'GET',
      } as IncomingMessage;

      const writeHeadMock = vi.fn();
      const endMock = vi.fn();
      const mockRes = {
        writeHead: writeHeadMock,
        end: endMock,
      } as unknown as ServerResponse;

      // Execute the captured request handler
      expect(capturedRequestHandler).not.toBeNull();
      if (capturedRequestHandler) {
        await capturedRequestHandler(mockReq, mockRes);

        // Verify Cache-Control header is set to no-cache
        expect(writeHeadMock).toHaveBeenCalledWith(
          expect.any(Number),
          expect.objectContaining({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }),
        );
      }
    });

    it('should set Access-Control-Allow-Origin header', async () => {
      const previewServer = await createPreviewServer();
      await previewServer.start();

      const mockReq = {
        url: '/',
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

        expect(writeHeadMock).toHaveBeenCalledWith(
          expect.any(Number),
          expect.objectContaining({
            'Access-Control-Allow-Origin': '*',
          }),
        );
      }
    });

    it('should return 404 for non-existent files', async () => {
      // Mock readFile to throw an error for non-existent files
      const { readFile } = await import('fs/promises');
      vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const previewServer = await createPreviewServer();
      await previewServer.start();

      const mockReq = {
        url: '/non-existent.html',
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

        // Should return 404 status code
        expect(writeHeadMock).toHaveBeenCalledWith(404, expect.any(Object));
      }
    });
  });
});
