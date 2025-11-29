import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { setTimeout } from 'node:timers/promises';
import {
  compileTypeScript,
  compileStatiConfig,
  cleanupCompiledConfig,
  createTypeScriptWatcher,
  autoInjectBundle,
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
      expect(result.bundleFilename).toBeUndefined();
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

  describe('createTypeScriptWatcher', () => {
    it('should create watcher and initialize successfully', async () => {
      // Arrange - create a test TypeScript file
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Hello from TypeScript");');

      const onRebuild = vi.fn();

      // Act
      const context = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Assert
      expect(context).toBeDefined();
      expect(context.dispose).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Watching TypeScript files in src/');

      // Cleanup
      await context.dispose();
    });

    it('should throw error when entry point does not exist', async () => {
      // Arrange - no TypeScript file created
      const onRebuild = vi.fn();

      // Act & Assert
      await expect(
        createTypeScriptWatcher({
          projectRoot: testDir,
          config: { enabled: true },
          mode: 'development',
          logger: mockLogger,
          onRebuild,
          outDir: 'dist',
        }),
      ).rejects.toThrow('Entry point not found');

      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('TypeScript entry point not found'),
      );
    });

    it('should respect custom srcDir and entryPoint configuration', async () => {
      // Arrange
      const customSrcDir = join(testDir, 'scripts');
      mkdirSync(customSrcDir, { recursive: true });
      writeFileSync(join(customSrcDir, 'app.ts'), 'console.log("Custom entry");');

      const onRebuild = vi.fn();

      // Act
      const context = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: {
          enabled: true,
          srcDir: 'scripts',
          entryPoint: 'app.ts',
        },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Assert
      expect(context).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Watching TypeScript files in scripts/');

      // Cleanup
      await context.dispose();
    });

    it('should properly cleanup via dispose()', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'export const x = 1;');

      const onRebuild = vi.fn();

      const context = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Act - dispose should complete without error
      await expect(context.dispose()).resolves.not.toThrow();
    });

    it('should output to correct directory with custom outDir', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'export const y = 2;');

      const onRebuild = vi.fn();

      // Act
      const context = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: {
          enabled: true,
          outDir: 'js',
        },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Wait briefly for initial build
      await setTimeout(100);

      // Assert - output should be in dist/js
      const outputPath = join(testDir, 'dist', 'js', 'bundle.js');
      expect(existsSync(outputPath)).toBe(true);

      // Cleanup
      await context.dispose();
    });

    it('should use stable filename without hash in development mode', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'export const z = 3;');

      const onRebuild = vi.fn();

      // Act
      const context = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: {
          enabled: true,
          bundleName: 'app',
        },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Wait briefly for initial build
      await setTimeout(100);

      // Assert - should use stable filename without hash
      const outputPath = join(testDir, 'dist', '_assets', 'app.js');
      expect(existsSync(outputPath)).toBe(true);

      // Cleanup
      await context.dispose();
    });

    it('should invoke onRebuild callback after successful compilation', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'export const initial = true;');

      const onRebuild = vi.fn();

      // Act
      const context = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Wait for initial build to complete
      await setTimeout(150);

      // Assert - onRebuild should have been called after initial build
      expect(onRebuild).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('TypeScript recompiled.');

      // Cleanup
      await context.dispose();
    });

    it('should generate source maps in development mode', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'export const debug = true;');

      const onRebuild = vi.fn();

      // Act
      const context = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Wait for initial build
      await setTimeout(100);

      // Assert - source map should exist
      const sourcemapPath = join(testDir, 'dist', '_assets', 'bundle.js.map');
      expect(existsSync(sourcemapPath)).toBe(true);

      // Cleanup
      await context.dispose();
    });
  });

  describe('autoInjectBundle', () => {
    it('should inject script tag before </body>', () => {
      const html = '<html><head></head><body><p>Content</p></body></html>';
      const result = autoInjectBundle(html, '/_assets/bundle.js');

      expect(result).toContain('<script type="module" src="/_assets/bundle.js"></script>');
      expect(result).toContain('</body>');
      // Script should be before </body>
      expect(result.indexOf('<script')).toBeLessThan(result.indexOf('</body>'));
    });

    it('should handle hashed bundle filenames', () => {
      const html = '<html><body>Content</body></html>';
      const result = autoInjectBundle(html, '/_assets/bundle-a1b2c3d4.js');

      expect(result).toContain('src="/_assets/bundle-a1b2c3d4.js"');
    });

    it('should return original HTML if bundlePath is empty', () => {
      const html = '<html><body>Content</body></html>';
      const result = autoInjectBundle(html, '');

      expect(result).toBe(html);
    });

    it('should return original HTML if no </body> tag found', () => {
      const html = '<html><head></head>Content';
      const result = autoInjectBundle(html, '/_assets/bundle.js');

      expect(result).toBe(html);
    });

    it('should not duplicate script tag if already present', () => {
      const html =
        '<html><body><script type="module" src="/_assets/bundle.js"></script></body></html>';
      const result = autoInjectBundle(html, '/_assets/bundle.js');

      // Should return original HTML, not add duplicate
      expect(result).toBe(html);
      // Count occurrences of the script tag
      const matches = result.match(/bundle\.js/g);
      expect(matches?.length).toBe(1);
    });

    it('should handle case-insensitive </BODY> tag', () => {
      const html = '<html><BODY>Content</BODY></html>';
      const result = autoInjectBundle(html, '/_assets/bundle.js');

      expect(result).toContain('<script type="module" src="/_assets/bundle.js"></script>');
    });

    it('should preserve HTML structure', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <main>Content</main>
</body>
</html>`;
      const result = autoInjectBundle(html, '/_assets/bundle.js');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test</title>');
      expect(result).toContain('<main>Content</main>');
      expect(result).toContain('</html>');
    });

    describe('XSS prevention', () => {
      it('should reject paths with script injection attempts', () => {
        const html = '<html><body>Content</body></html>';
        const maliciousPath = '/_assets/bundle.js" onload="alert(1)" data-x="';
        const result = autoInjectBundle(html, maliciousPath);

        // Should return original HTML without injection
        expect(result).toBe(html);
      });

      it('should reject paths with HTML tags', () => {
        const html = '<html><body>Content</body></html>';
        const maliciousPath = '/_assets/<script>alert(1)</script>.js';
        const result = autoInjectBundle(html, maliciousPath);

        expect(result).toBe(html);
      });

      it('should reject paths without leading slash', () => {
        const html = '<html><body>Content</body></html>';
        const result = autoInjectBundle(html, '_assets/bundle.js');

        expect(result).toBe(html);
      });

      it('should reject paths not ending in .js', () => {
        const html = '<html><body>Content</body></html>';
        const result = autoInjectBundle(html, '/_assets/bundle.ts');

        expect(result).toBe(html);
      });

      it('should allow valid nested paths', () => {
        const html = '<html><body>Content</body></html>';
        const result = autoInjectBundle(html, '/_assets/js/vendor/bundle-abc123.js');

        expect(result).toContain('src="/_assets/js/vendor/bundle-abc123.js"');
      });

      it('should allow paths with underscores and hyphens', () => {
        const html = '<html><body>Content</body></html>';
        const result = autoInjectBundle(html, '/_assets/my_bundle-file.js');

        expect(result).toContain('src="/_assets/my_bundle-file.js"');
      });
    });
  });
});
