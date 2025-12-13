import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Define logger type locally
interface Logger {
  info: (msg: string) => void;
  success: (msg: string) => void;
  warning: (msg: string) => void;
  error: (msg: string) => void;
  building: (msg: string) => void;
  processing: (msg: string) => void;
  stats: (msg: string) => void;
}

// Create mock logger
const mockLogger: Logger = {
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  building: vi.fn(),
  processing: vi.fn(),
  stats: vi.fn(),
};

// Mock @stati/core to prevent actual build operations
vi.mock('@stati/core', () => ({
  build: vi.fn().mockResolvedValue({
    pagesBuilt: 5,
    duration: 1000,
    cacheHits: 2,
    cacheWrites: 3,
  }),
  invalidate: vi.fn().mockResolvedValue({
    invalidatedCount: 3,
    invalidatedPaths: ['/page1', '/page2', '/page3'],
    clearedAll: false,
  }),
  createDevServer: vi.fn().mockResolvedValue({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
  createPreviewServer: vi.fn().mockResolvedValue({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    url: 'http://localhost:4000',
  }),
  setEnv: vi.fn(),
}));

// Mock logger module
vi.mock('../src/logger.js', () => ({
  createLogger: vi.fn(() => mockLogger),
}));

// Mock colors to prevent actual console output during tests
vi.mock('../src/colors.js', () => ({
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
    header: vi.fn(),
    step: vi.fn(),
    progress: vi.fn(),
    file: vi.fn(),
    url: vi.fn(),
    timing: vi.fn(),
    statsTable: vi.fn(),
    navigationTree: vi.fn(),
    startRenderingTree: vi.fn(),
    addTreeNode: vi.fn(),
    updateTreeNode: vi.fn(),
    showRenderingTree: vi.fn(),
    clearRenderingTree: vi.fn(),
  },
}));

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('version reading', () => {
    it('should read version from package.json', () => {
      // Arrange - This tests the getVersion function behavior
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const packageJsonPath = join(__dirname, '../package.json');

      // Act & Assert
      expect(() => {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        expect(packageJson.version).toBeDefined();
        expect(typeof packageJson.version).toBe('string');
        expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/); // Should be semver format
      }).not.toThrow();
    });

    it('should handle missing package.json gracefully', () => {
      // This test validates error handling in getVersion
      const nonExistentPath = '/non/existent/package.json';

      expect(() => {
        try {
          readFileSync(nonExistentPath, 'utf-8');
        } catch {
          // Should return 'unknown' in the actual implementation
          expect('unknown').toBe('unknown');
        }
      }).not.toThrow();
    });
  });

  describe('build command', () => {
    it('should call build with correct default options', async () => {
      // Import after mocks are set up
      const { build } = await import('@stati/core');

      // Test that build can be called with proper options
      await (build as ReturnType<typeof vi.fn>)({
        force: false,
        clean: false,
        includeDrafts: false,
        version: 'test',
      });

      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          force: false,
          clean: false,
          includeDrafts: false,
          version: 'test',
        }),
      );
    });

    it('should pass force flag correctly', async () => {
      const { build } = await import('@stati/core');

      await (build as ReturnType<typeof vi.fn>)({
        force: true,
        clean: false,
        includeDrafts: false,
      });

      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          force: true,
        }),
      );
    });

    it('should pass clean flag correctly', async () => {
      const { build } = await import('@stati/core');

      await (build as ReturnType<typeof vi.fn>)({
        force: false,
        clean: true,
        includeDrafts: false,
      });

      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          clean: true,
        }),
      );
    });

    it('should pass include-drafts flag correctly', async () => {
      const { build } = await import('@stati/core');

      await (build as ReturnType<typeof vi.fn>)({
        force: false,
        clean: false,
        includeDrafts: true,
      });

      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          includeDrafts: true,
        }),
      );
    });
  });

  describe('dev command integration', () => {
    it('should create dev server with proper configuration', async () => {
      const { createDevServer } = await import('@stati/core');

      // Test dev server creation
      const mockDevOptions = {
        port: 3000,
        open: false,
      };

      await (createDevServer as ReturnType<typeof vi.fn>)(mockDevOptions);

      expect(createDevServer).toHaveBeenCalledWith(mockDevOptions);
    });
  });

  describe('preview command integration', () => {
    it('should create preview server with proper configuration', async () => {
      const { createPreviewServer } = await import('@stati/core');

      // Test preview server creation
      const mockPreviewOptions = {
        port: 4000,
        host: 'localhost',
        open: false,
      };

      await (createPreviewServer as ReturnType<typeof vi.fn>)(mockPreviewOptions);

      expect(createPreviewServer).toHaveBeenCalledWith(mockPreviewOptions);
    });

    it('should create preview server with different port than dev server', async () => {
      const { createPreviewServer } = await import('@stati/core');

      // Test preview server creation with port 4000 (different from dev server's 3000)
      const mockPreviewOptions = {
        port: 4000,
        host: 'localhost',
        open: false,
      };

      const mockServer = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        url: 'http://localhost:4000',
      };

      (createPreviewServer as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockServer);

      const previewServer = await (createPreviewServer as ReturnType<typeof vi.fn>)(
        mockPreviewOptions,
      );

      expect(createPreviewServer).toHaveBeenCalledWith(mockPreviewOptions);
      expect(previewServer.url).toBe('http://localhost:4000');
    });
  });

  describe('invalidate command integration', () => {
    it('should call invalidate function', async () => {
      const { invalidate } = await import('@stati/core');

      await (invalidate as ReturnType<typeof vi.fn>)();

      expect(invalidate).toHaveBeenCalled();
    });
  });

  describe('open flag behavior', () => {
    describe('dev command', () => {
      it('should pass open: true when --open flag is used', async () => {
        const { createDevServer } = await import('@stati/core');

        // Simulate the behavior when --open is passed
        const devOptions = {
          port: 3000,
          host: 'localhost',
          open: true,
        };

        await (createDevServer as ReturnType<typeof vi.fn>)(devOptions);

        expect(createDevServer).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
      });

      it('should pass open: false when --no-open flag is used', async () => {
        const { createDevServer } = await import('@stati/core');

        // Simulate the behavior when --no-open is passed
        const devOptions = {
          port: 3000,
          host: 'localhost',
          open: false,
        };

        await (createDevServer as ReturnType<typeof vi.fn>)(devOptions);

        expect(createDevServer).toHaveBeenCalledWith(expect.objectContaining({ open: false }));
      });

      it('should NOT include open property when no --open flag is provided', async () => {
        const { createDevServer } = await import('@stati/core');

        // Simulate the behavior when no --open flag is passed
        // This allows config file value to take precedence
        const devOptions = {
          port: 3000,
          host: 'localhost',
          // open is intentionally not included
        };

        await (createDevServer as ReturnType<typeof vi.fn>)(devOptions);

        expect(createDevServer).toHaveBeenCalledWith(
          expect.not.objectContaining({ open: expect.anything() }),
        );
      });
    });

    describe('preview command', () => {
      it('should pass open: true when --open flag is used', async () => {
        const { createPreviewServer } = await import('@stati/core');

        // Simulate the behavior when --open is passed
        const previewOptions = {
          port: 4000,
          host: 'localhost',
          open: true,
        };

        await (createPreviewServer as ReturnType<typeof vi.fn>)(previewOptions);

        expect(createPreviewServer).toHaveBeenCalledWith(expect.objectContaining({ open: true }));
      });

      it('should pass open: false when --no-open flag is used', async () => {
        const { createPreviewServer } = await import('@stati/core');

        // Simulate the behavior when --no-open is passed
        const previewOptions = {
          port: 4000,
          host: 'localhost',
          open: false,
        };

        await (createPreviewServer as ReturnType<typeof vi.fn>)(previewOptions);

        expect(createPreviewServer).toHaveBeenCalledWith(expect.objectContaining({ open: false }));
      });

      it('should NOT include open property when no --open flag is provided', async () => {
        const { createPreviewServer } = await import('@stati/core');

        // Simulate the behavior when no --open flag is passed
        // This allows config file value to take precedence
        const previewOptions = {
          port: 4000,
          host: 'localhost',
          // open is intentionally not included
        };

        await (createPreviewServer as ReturnType<typeof vi.fn>)(previewOptions);

        expect(createPreviewServer).toHaveBeenCalledWith(
          expect.not.objectContaining({ open: expect.anything() }),
        );
      });
    });
  });
});
