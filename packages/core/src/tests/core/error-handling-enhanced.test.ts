import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies with factory functions
vi.mock('../../config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../core/build.js', () => ({
  build: vi.fn(),
}));

vi.mock('http', () => ({
  createServer: vi.fn(),
}));

vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
    clients: new Set(),
  })),
}));

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(),
  },
  watch: vi.fn(),
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
      const { loadConfig } = await import('../../config/loader.js');
      vi.mocked(loadConfig).mockRejectedValue(new Error('Configuration file not found'));

      const { createDevServer } = await import('../../core/dev.js');

      await expect(createDevServer()).rejects.toThrow('Configuration file not found');
    });

    it('should handle invalid configuration syntax', async () => {
      const { loadConfig } = await import('../../config/loader.js');
      vi.mocked(loadConfig).mockRejectedValue(new SyntaxError('Invalid syntax in configuration'));

      const { createDevServer } = await import('../../core/dev.js');

      await expect(createDevServer()).rejects.toThrow('Invalid syntax in configuration');
    });

    it('should handle configuration with missing required fields', async () => {
      const { loadConfig } = await import('../../config/loader.js');
      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);

      const { createDevServer } = await import('../../core/dev.js');

      // Should use defaults for missing fields
      const devServer = await createDevServer();
      expect(devServer).toBeDefined();
      expect(devServer.url).toBe('http://localhost:3000');
    });
  });

  describe('Build Process Errors', () => {
    it('should handle build failures during initial build', async () => {
      const { loadConfig } = await import('../../config/loader.js');
      const { build } = await import('../../core/build.js');

      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);
      vi.mocked(build).mockRejectedValue(new Error('Build failed: Template syntax error'));

      const { createDevServer } = await import('../../core/dev.js');

      const devServer = await createDevServer();
      await expect(devServer.start()).rejects.toThrow('Build failed: Template syntax error');
    });

    it('should handle template dependency resolution errors', async () => {
      const { loadConfig } = await import('../../config/loader.js');
      const { build } = await import('../../core/build.js');

      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);
      vi.mocked(build).mockRejectedValue(new Error('Template not found: missing-layout.eta'));

      const { createDevServer } = await import('../../core/dev.js');

      const devServer = await createDevServer();
      await expect(devServer.start()).rejects.toThrow('Template not found: missing-layout.eta');
    });

    it('should handle markdown parsing errors', async () => {
      const { loadConfig } = await import('../../config/loader.js');
      const { build } = await import('../../core/build.js');

      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);
      vi.mocked(build).mockRejectedValue(new Error('Invalid front-matter in file.md'));

      const { createDevServer } = await import('../../core/dev.js');

      const devServer = await createDevServer();
      await expect(devServer.start()).rejects.toThrow('Invalid front-matter in file.md');
    });
  });

  describe('Memory and Resource Errors', () => {
    it('should handle out of memory errors during large builds', async () => {
      const { loadConfig } = await import('../../config/loader.js');
      const { build } = await import('../../core/build.js');

      vi.mocked(loadConfig).mockResolvedValue(defaultConfig);
      vi.mocked(build).mockRejectedValue(new Error('JavaScript heap out of memory'));

      const { createDevServer } = await import('../../core/dev.js');

      const devServer = await createDevServer();
      await expect(devServer.start()).rejects.toThrow('JavaScript heap out of memory');
    });
  });
});
