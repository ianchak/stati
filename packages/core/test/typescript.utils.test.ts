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
  autoInjectBundles,
} from '../src/core/utils/typescript.utils.js';
import type { TypeScriptConfig, BundleConfig } from '../src/types/config.js';
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
    it('should compile single bundle with default config', async () => {
      // Arrange - create a test TypeScript file
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Hello from TypeScript");');

      const config: TypeScriptConfig = {
        enabled: true,
      };

      // Act
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]!.bundleFilename).toBe('main.js'); // Default bundleName is 'main', no hash in dev
      expect(results[0]!.bundlePath).toBe('/_assets/main.js');
      expect(results[0]!.config.bundleName).toBe('main');
      expect(mockLogger.info).toHaveBeenCalledWith('Compiling TypeScript (1 bundle)...');
      expect(mockLogger.success).toHaveBeenCalled();

      // Verify output file exists
      const outputPath = join(testDir, 'dist', '_assets', 'main.js');
      expect(existsSync(outputPath)).toBe(true);

      // Verify source map exists (dev mode default)
      const sourcemapPath = join(testDir, 'dist', '_assets', 'main.js.map');
      expect(existsSync(sourcemapPath)).toBe(true);
    });

    it('should compile with production mode defaults (hash enabled)', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'export const greeting = "Hello";');

      const config: TypeScriptConfig = {
        enabled: true,
      };

      // Act
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'production',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert - production mode includes hash by default
      expect(results).toHaveLength(1);
      expect(results[0]!.bundleFilename).toMatch(/^main-[a-zA-Z0-9]+\.js$/);
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

    it('should return empty array and warn when entry point is missing', async () => {
      // Arrange - no TypeScript file created
      const config: TypeScriptConfig = {
        enabled: true,
      };

      // Act
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
      });

      // Assert
      expect(results).toEqual([]);
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('TypeScript entry point not found'),
      );
      expect(mockLogger.warning).toHaveBeenCalledWith(
        'No TypeScript bundles were compiled (all entry points missing).',
      );
    });

    it('should compile multiple bundles in parallel', async () => {
      // Arrange - create multiple TypeScript files
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'core.ts'), 'export const core = "core";');
      writeFileSync(join(srcDir, 'docs.ts'), 'export const docs = "docs";');

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [
          { entryPoint: 'core.ts', bundleName: 'core' },
          { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
        ],
      };

      // Act
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.bundleFilename).sort()).toEqual(['core.js', 'docs.js']);
      expect(mockLogger.info).toHaveBeenCalledWith('Compiling TypeScript (2 bundles)...');

      // Verify both output files exist
      expect(existsSync(join(testDir, 'dist', '_assets', 'core.js'))).toBe(true);
      expect(existsSync(join(testDir, 'dist', '_assets', 'docs.js'))).toBe(true);
    });

    it('should skip missing entry points and compile valid ones', async () => {
      // Arrange - create only one TypeScript file
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'core.ts'), 'export const core = "core";');
      // Note: docs.ts is NOT created

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [
          { entryPoint: 'core.ts', bundleName: 'core' },
          { entryPoint: 'docs.ts', bundleName: 'docs' }, // Missing
        ],
      };

      // Act
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert - only core bundle should be compiled
      expect(results).toHaveLength(1);
      expect(results[0]!.bundleFilename).toBe('core.js');
      expect(mockLogger.warning).toHaveBeenCalledWith(expect.stringContaining('bundle: docs'));
    });

    it('should return empty array for empty bundles config', async () => {
      // Arrange
      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [],
      };

      // Act
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert
      expect(results).toEqual([]);
      expect(mockLogger.warning).toHaveBeenCalledWith(
        'TypeScript is enabled but no bundles are configured. Add bundles to your stati.config.ts or disable TypeScript.',
      );
    });

    it('should respect custom srcDir', async () => {
      // Arrange
      const customSrcDir = join(testDir, 'scripts');
      mkdirSync(customSrcDir, { recursive: true });
      writeFileSync(join(customSrcDir, 'app.ts'), 'console.log("Custom entry");');

      const config: TypeScriptConfig = {
        enabled: true,
        srcDir: 'scripts',
        bundles: [{ entryPoint: 'app.ts', bundleName: 'app' }],
      };

      // Act
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]!.bundleFilename).toBe('app.js');
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
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert - output should be in dist/js not dist/_assets
      expect(results[0]!.bundlePath).toBe('/js/main.js');
      const outputPath = join(testDir, 'dist', 'js', 'main.js');
      expect(existsSync(outputPath)).toBe(true);
    });

    it('should throw and log error on compilation failure', async () => {
      // Arrange - create an invalid TypeScript file
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        join(srcDir, 'main.ts'),
        `
const x: number = "this is not a number";
export const broken = {
  unclosed: [
};
`,
      );

      const config: TypeScriptConfig = {
        enabled: true,
      };

      // Act & Assert
      await expect(
        compileTypeScript({
          projectRoot: testDir,
          config,
          mode: 'development',
          logger: mockLogger,
          outDir: 'dist',
        }),
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Bundle 'main' compilation failed"),
      );
    });

    it('should preserve bundle config in results', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'docs.ts'), 'export const docs = true;');

      const bundleConfig: BundleConfig = {
        entryPoint: 'docs.ts',
        bundleName: 'docs',
        include: ['/docs/**'],
        exclude: ['/docs/legacy/**'],
      };

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [bundleConfig],
      };

      // Act
      const results = await compileTypeScript({
        projectRoot: testDir,
        config,
        mode: 'development',
        logger: mockLogger,
        outDir: 'dist',
      });

      // Assert - config should be preserved
      expect(results[0]!.config).toEqual(bundleConfig);
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
    it('should create watchers and initialize successfully', async () => {
      // Arrange - create a test TypeScript file
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Hello from TypeScript");');

      const onRebuild = vi.fn();

      // Act
      const contexts = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Assert
      expect(contexts).toHaveLength(1);
      expect(contexts[0]!.dispose).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Watching TypeScript files in src/ (1 bundle)');

      // Cleanup
      await Promise.all(contexts.map((c) => c.dispose()));
    });

    it('should return empty array when entry point does not exist', async () => {
      // Arrange - no TypeScript file created
      const onRebuild = vi.fn();

      // Act - should NOT throw, returns empty array
      const contexts = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Assert
      expect(contexts).toEqual([]);
      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('TypeScript entry point not found'),
      );
    });

    it('should create multiple watchers for multiple bundles', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'core.ts'), 'console.log("Core");');
      writeFileSync(join(srcDir, 'docs.ts'), 'console.log("Docs");');

      const onRebuild = vi.fn();

      // Act
      const contexts = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: {
          enabled: true,
          bundles: [
            { entryPoint: 'core.ts', bundleName: 'core' },
            { entryPoint: 'docs.ts', bundleName: 'docs' },
          ],
        },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Assert
      expect(contexts).toHaveLength(2);
      expect(mockLogger.info).toHaveBeenCalledWith('Watching TypeScript files in src/ (2 bundles)');

      // Cleanup
      await Promise.all(contexts.map((c) => c.dispose()));
    });

    it('should respect custom srcDir', async () => {
      // Arrange
      const customSrcDir = join(testDir, 'scripts');
      mkdirSync(customSrcDir, { recursive: true });
      writeFileSync(join(customSrcDir, 'app.ts'), 'console.log("Custom entry");');

      const onRebuild = vi.fn();

      // Act
      const contexts = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: {
          enabled: true,
          srcDir: 'scripts',
          bundles: [{ entryPoint: 'app.ts', bundleName: 'app' }],
        },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Assert
      expect(contexts).toHaveLength(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Watching TypeScript files in scripts/ (1 bundle)',
      );

      // Cleanup
      await Promise.all(contexts.map((c) => c.dispose()));
    });

    it('should properly cleanup via dispose()', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Hello");');

      const onRebuild = vi.fn();
      const contexts = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Act - dispose should complete without error
      await expect(Promise.all(contexts.map((c) => c.dispose()))).resolves.not.toThrow();
    });

    it('should output to correct directory with custom outDir', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Custom out");');

      const onRebuild = vi.fn();
      const contexts = await createTypeScriptWatcher({
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

      // Wait a bit for initial build
      await setTimeout(100);

      // Assert - output should be in dist/js
      const outputPath = join(testDir, 'dist', 'js', 'main.js');
      expect(existsSync(outputPath)).toBe(true);

      // Cleanup
      await Promise.all(contexts.map((c) => c.dispose()));
    });

    it('should use stable filename without hash in development mode', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Dev mode");');

      const onRebuild = vi.fn();
      const contexts = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Wait a bit for initial build
      await setTimeout(100);

      // Assert - should use stable filename without hash
      const outputPath = join(testDir, 'dist', '_assets', 'main.js');
      expect(existsSync(outputPath)).toBe(true);

      // Cleanup
      await Promise.all(contexts.map((c) => c.dispose()));
    });

    it('should invoke onRebuild callback with results', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Initial");');

      const onRebuild = vi.fn();
      const contexts = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        mode: 'development',
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Wait for initial build to complete
      await setTimeout(200);

      // Trigger a rebuild by modifying the file
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Modified");');

      // Wait for rebuild
      await setTimeout(300);

      // Assert - onRebuild should have been called with results array
      expect(onRebuild).toHaveBeenCalled();
      const lastCall = onRebuild.mock.calls[onRebuild.mock.calls.length - 1];
      expect(Array.isArray(lastCall![0])).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith("TypeScript 'main' recompiled.");

      // Cleanup
      await Promise.all(contexts.map((c) => c.dispose()));
    });

    it('should generate source maps in development mode', async () => {
      // Arrange
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Source maps");');

      const onRebuild = vi.fn();
      const contexts = await createTypeScriptWatcher({
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
      const sourcemapPath = join(testDir, 'dist', '_assets', 'main.js.map');
      expect(existsSync(sourcemapPath)).toBe(true);

      // Cleanup
      await Promise.all(contexts.map((c) => c.dispose()));
    });
  });

  describe('autoInjectBundles', () => {
    it('should inject multiple bundle script tags before </body>', () => {
      const html = '<html><body>Content</body></html>';
      const result = autoInjectBundles(html, ['/_assets/core.js', '/_assets/docs.js']);
      expect(result).toContain('<script type="module" src="/_assets/core.js"></script>');
      expect(result).toContain('<script type="module" src="/_assets/docs.js"></script>');
      expect(result.indexOf('core.js')).toBeLessThan(result.indexOf('docs.js'));
    });

    it('should not inject if bundlePaths is empty', () => {
      const html = '<html><body>Content</body></html>';
      const result = autoInjectBundles(html, []);
      expect(result).toBe(html);
    });

    it('should skip invalid paths', () => {
      const html = '<html><body>Content</body></html>';
      const result = autoInjectBundles(html, [
        '/_assets/valid.js',
        'invalid-no-leading-slash.js',
        '/_assets/also-valid.js',
      ]);
      expect(result).toContain('/_assets/valid.js');
      expect(result).toContain('/_assets/also-valid.js');
      expect(result).not.toContain('invalid-no-leading-slash.js');
    });

    it('should skip already included bundles', () => {
      const html =
        '<html><body><script type="module" src="/_assets/core.js"></script></body></html>';
      const result = autoInjectBundles(html, ['/_assets/core.js', '/_assets/docs.js']);
      // core.js should not be duplicated
      expect(result.match(/core\.js/g)?.length).toBe(1);
      expect(result).toContain('/_assets/docs.js');
    });

    it('should return original html if no </body> tag found', () => {
      const html = '<html><div>No body close</div></html>';
      const result = autoInjectBundles(html, ['/_assets/bundle.js']);
      expect(result).toBe(html);
    });

    it('should handle case-insensitive </body> tag', () => {
      const html = '<html><body>Content</BODY></html>';
      const result = autoInjectBundles(html, ['/_assets/bundle.js']);
      expect(result).toContain('<script type="module" src="/_assets/bundle.js"></script>');
    });

    it('should sanitize paths to prevent XSS', () => {
      const html = '<html><body>Content</body></html>';
      // Attempt XSS through path
      const result = autoInjectBundles(html, ['/_assets/bundle.js"><script>alert(1)</script>']);
      expect(result).not.toContain('alert(1)');
      expect(result).toBe(html); // Invalid path should be skipped
    });

    describe('path validation', () => {
      it('should reject paths not starting with /', () => {
        const html = '<html><body>Content</body></html>';
        const result = autoInjectBundles(html, ['_assets/bundle.js']);
        expect(result).toBe(html);
      });

      it('should reject paths not ending in .js', () => {
        const html = '<html><body>Content</body></html>';
        const result = autoInjectBundles(html, ['/_assets/bundle.ts']);
        expect(result).toBe(html);
      });

      it('should allow valid nested paths', () => {
        const html = '<html><body>Content</body></html>';
        const result = autoInjectBundles(html, ['/_assets/js/vendor/bundle-abc123.js']);
        expect(result).toContain('src="/_assets/js/vendor/bundle-abc123.js"');
      });

      it('should allow paths with underscores and hyphens', () => {
        const html = '<html><body>Content</body></html>';
        const result = autoInjectBundles(html, ['/_assets/my_bundle-file.js']);
        expect(result).toContain('src="/_assets/my_bundle-file.js"');
      });
    });
  });
});
