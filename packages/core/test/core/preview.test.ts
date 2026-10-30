import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPreviewServer } from '../../src/core/preview.js';
import type { PreviewServerOptions } from '../../src/core/preview.js';
import { loadConfig } from '../../src/config/loader.js';
import { getEnv, isProduction, setEnv } from '../../src/env.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Store the request handler for testing
let capturedRequestHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

// Mock dependencies
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
    probeError = null;
    listenError = null;

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

  it('should fail with a clear error when the port is in use', async () => {
    probeError = Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' });

    const previewServer = await createPreviewServer();

    await expect(previewServer.start()).rejects.toThrow(
      'Port 4000 is already in use on localhost. Stop the process using it, or choose another port with --port or `preview.port` in your Stati config.',
    );
  });

  it('should map listen errors to a clear error when the port is taken after the probe', async () => {
    listenError = Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' });

    const previewServer = await createPreviewServer();

    await expect(previewServer.start()).rejects.toThrow(
      'Port 4000 is already in use on localhost.',
    );
  });

  it('should load configuration correctly', async () => {
    await createPreviewServer();

    expect(mockLoadConfig).toHaveBeenCalledWith(process.cwd());
  });

  it('should handle configuration loading errors', async () => {
    mockLoadConfig.mockRejectedValueOnce(new Error('Config not found'));

    await expect(createPreviewServer()).rejects.toThrow('Config not found');
  });

  it('should load the config in production, as stati build does', async () => {
    const previousEnv = getEnv();
    setEnv('development');

    let envWhenLoaded: string | undefined;
    mockLoadConfig.mockImplementationOnce(async () => {
      envWhenLoaded = getEnv();
      return {
        srcDir: 'site',
        outDir: 'dist',
        staticDir: 'public',
        site: {
          title: 'Test Site',
          baseUrl: isProduction() ? 'https://example.com/docs' : 'http://localhost:4000',
        },
      };
    });

    try {
      const previewServer = await createPreviewServer();

      expect(envWhenLoaded).toBe('production');
      // The site is served under the base path the production build links to
      expect(previewServer.url).toBe('http://localhost:4000/docs/');
    } finally {
      setEnv(previousEnv);
    }
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
      // Mock stat to throw for non-existent files so the pretty URL resolver reports not found
      const { stat } = await import('fs/promises');
      vi.mocked(stat).mockRejectedValueOnce(
        Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }),
      );

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

    it('should return 403 for path traversal attempts', async () => {
      // The request resolves outside the output directory
      const previewServer = await createPreviewServer();
      await previewServer.start();

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
    });
  });
});
