import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  compileTypeScript,
  compileStatiConfig,
  cleanupCompiledConfig,
} from '../src/core/utils/typescript.utils.js';
import type { TypeScriptConfig } from '../src/types/config.js';
import type { Logger } from '../src/types/logging.js';

describe('typescript.utils', () => {
  let testDir: string;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `stati-ts-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('compileTypeScript', () => {
    it('should compile TypeScript with development mode defaults', async () => {
      // Arrange - create a test TypeScript file
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Hello from TypeScript");');

      const config: TypeScriptConfig = {
        enabled: true,
      };

      // Act
      const result = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert
      expect(result.bundleFilename).toBe('bundle.js'); // No hash in dev mode
      expect(mockLogger.info).toHaveBeenCalledWith('Compiling TypeScript...');
      expect(mockLogger.success).toHaveBeenCalled();

      // Verify output file exists
      const outputPath = join(testDir, 'dist', '_assets', 'bundle.js');
      expect(existsSync(outputPath)).toBe(true);

      // Verify source map exists (dev mode default)
      const sourcemapPath = join(testDir, 'dist', '_assets', 'bundle.js.map');
      expect(existsSync(sourcemapPath)).toBe(true);
    });

    it('should compile TypeScript with production mode defaults', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'export const greeting = "Hello";');

      const config: TypeScriptConfig = {
        enabled: true,
      };

      // Act
      const result = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'production',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert - production mode includes hash by default
      expect(result.bundleFilename).toMatch(/^bundle-[a-zA-Z0-9]+\.js$/);
      expect(mockLogger.success).toHaveBeenCalled();

      // Verify output file exists (find it with hash)
      const assetsDir = join(testDir, 'dist', '_assets');
      const files = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
      const jsFile = files.find((f: string) => f.endsWith('.js') && !f.endsWith('.map'));
      expect(jsFile).toBeDefined();

      // No source map in production by default
      const sourcemapFiles = files.filter((f: string) => f.endsWith('.js.map'));
      expect(sourcemapFiles).toHaveLength(0);
    });

    it('should warn and skip compilation when entry point is missing', async () => {
      // Arrange - no TypeScript file created
      const config: TypeScriptConfig = {
        enabled: true,
      };

      // Act
      const result = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
      });

      // Assert
      expect(result.bundleFilename).toBe('');
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('TypeScript entry point not found'),
      );
      expect(mockLogger.warning).toHaveBeenCalledWith('Skipping TypeScript compilation.');
    });

    it('should respect custom srcDir and entryPoint', async () => {
      // Arrange
      const customSrcDir = join(testDir, 'scripts');
      mkdirSync(customSrcDir, { recursive: true });
      writeFileSync(join(customSrcDir, 'app.ts'), 'console.log("Custom entry");');

      const config: TypeScriptConfig = {
        enabled: true,
        srcDir: 'scripts',
        entryPoint: 'app.ts',
      };

      // Act
      const result = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert
      expect(result.bundleFilename).toBe('bundle.js');
      expect(mockLogger.success).toHaveBeenCalled();
    });

    it('should respect custom bundleName', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Custom bundle");');

      const config: TypeScriptConfig = {
        enabled: true,
        bundleName: 'app',
        hash: false,
      };

      // Act
      const result = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'production',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert
      expect(result.bundleFilename).toBe('app.js');
    });

    it('should respect custom outDir', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Custom out");');

      const config: TypeScriptConfig = {
        enabled: true,
        outDir: 'js',
      };

      // Act
      await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert - output should be in dist/js not dist/_assets
      const outputPath = join(testDir, 'dist', 'js', 'bundle.js');
      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe('compileStatiConfig', () => {
    it('should compile stati.config.ts to .compiled.mjs', async () => {
      // Arrange
      const configPath = join(testDir, 'stati.config.ts');
      writeFileSync(
        configPath,
        `export default {
          site: {
            title: 'Test Site',
          },
        };`,
      );

      // Act
      const compiledPath = await compileStatiConfig(configPath);

      // Assert
      expect(compiledPath).toBe(join(testDir, 'stati.config.compiled.mjs'));
      expect(existsSync(compiledPath)).toBe(true);

      // Verify the compiled file is valid JavaScript
      const content = readFileSync(compiledPath, 'utf-8');
      expect(content).toContain('Test Site');
    });

    it('should compile TypeScript with type annotations', async () => {
      // Arrange
      const configPath = join(testDir, 'stati.config.ts');
      writeFileSync(
        configPath,
        `interface StatiConfig {
          site: { title: string };
        }
        const config: StatiConfig = {
          site: { title: 'Typed Config' },
        };
        export default config;`,
      );

      // Act
      const compiledPath = await compileStatiConfig(configPath);

      // Assert
      expect(existsSync(compiledPath)).toBe(true);
      const content = readFileSync(compiledPath, 'utf-8');
      expect(content).toContain('Typed Config');
      // Type annotations should be stripped
      expect(content).not.toContain('interface');
    });
  });

  describe('cleanupCompiledConfig', () => {
    it('should remove compiled config file', async () => {
      // Arrange
      const compiledPath = join(testDir, 'stati.config.compiled.mjs');
      writeFileSync(compiledPath, 'export default {}');
      expect(existsSync(compiledPath)).toBe(true);

      // Act
      await cleanupCompiledConfig(compiledPath);

      // Assert
      expect(existsSync(compiledPath)).toBe(false);
    });

    it('should not throw if file does not exist', async () => {
      // Arrange
      const nonexistentPath = join(testDir, 'nonexistent.mjs');

      // Act & Assert - should not throw
      await expect(cleanupCompiledConfig(nonexistentPath)).resolves.not.toThrow();
    });
  });
});
