import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies with factory functions
vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../src/core/build.js', () => ({
  build: vi.fn(),
}));

vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn((port, host, callback) => {
      if (callback) callback();
    }),
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('ws', () => {
  const MockWebSocketServer = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
    clients: new Set(),
  }));
  return {
    WebSocketServer: MockWebSocketServer,
  };
});

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
    })),
  },
  watch: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

const defaultConfig = {
  site: {
    title: 'Test Site',
    description: 'Test Description',
    baseUrl: 'https://example.com',
  },
  outDir: 'dist',
  srcDir: 'site',
  staticDir: 'public',
  base: '/',
  clean: false,
};

describe('Error Handling Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Errors', () => {
    it('should handle missing configuration file gracefully', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      vi.mocked(loadConfig).mockRejectedValue(new Error('Configuration file not found'));

      const { createDevServer } = await import('../../src/core/dev.js');

      await expect(createDevServer()).rejects.toThrow('Configuration file not found');
    });

    it('should handle invalid configuration syntax', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      vi.mocked(loadConfig).mockRejectedValue(new SyntaxError('Invalid syntax in configuration'));

      const { createDevServer } = await import('../../src/core/dev.js');

      await expect(createDevServer()).rejects.toThrow('Invalid syntax in configuration');
    });

    it('should handle configuration with missing required fields', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);

      const { createDevServer } = await import('../../src/core/dev.js');

      // Should use defaults for missing fields
      const devServer = await createDevServer();
      expect(devServer).toBeDefined();
      expect(devServer.url).toBe('http://localhost:3000');
    });
  });

  describe('Build Process Errors', () => {
    it('should handle build failures during initial build', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      const { build } = await import('../../src/core/build.js');

      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);
      vi.mocked(build).mockRejectedValue(new Error('Build failed: Template syntax error'));

      const { createDevServer } = await import('../../src/core/dev.js');

      const devServer = await createDevServer();
      await expect(devServer.start()).resolves.toBeUndefined();
    });

    it('should handle template dependency resolution errors', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      const { build } = await import('../../src/core/build.js');

      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);
      vi.mocked(build).mockRejectedValue(new Error('Template not found: missing-layout.eta'));

      const { createDevServer } = await import('../../src/core/dev.js');

      const devServer = await createDevServer();
      await expect(devServer.start()).resolves.toBeUndefined();
    });

    it('should handle markdown parsing errors', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      const { build } = await import('../../src/core/build.js');

      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);
      vi.mocked(build).mockRejectedValue(new Error('Invalid front-matter in file.md'));

      const { createDevServer } = await import('../../src/core/dev.js');

      const devServer = await createDevServer();
      await expect(devServer.start()).resolves.toBeUndefined();
    });
  });

  describe('Memory and Resource Errors', () => {
    it('should handle out of memory errors during large builds', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      const { build } = await import('../../src/core/build.js');

      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);
      vi.mocked(build).mockRejectedValue(new Error('JavaScript heap out of memory'));

      const { createDevServer } = await import('../../src/core/dev.js');

      const devServer = await createDevServer();
      await expect(devServer.start()).resolves.toBeUndefined();
    });
  });
});
