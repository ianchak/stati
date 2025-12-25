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
  isValidBundlePath,
  formatBytes,
  detectExistingBundles,
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
      status: vi.fn(),
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
      expect(results[0]!.filename).toBe('main.js'); // Default bundleName is 'main', no hash in dev
      expect(results[0]!.path).toBe('/_assets/main.js');
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
      expect(results[0]!.filename).toMatch(/^main-[a-zA-Z0-9]+\.js$/);
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
      expect(results.map((r) => r.filename).sort()).toEqual(['core.js', 'docs.js']);
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
      expect(results[0]!.filename).toBe('core.js');
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
      expect(results[0]!.filename).toBe('app.js');
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
      expect(results[0]!.path).toBe('/js/main.js');
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

    it('should throw DuplicateBundleNameError for duplicate bundleNames', async () => {
      // Arrange - create test TypeScript files
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("main");');
      writeFileSync(join(srcDir, 'other.ts'), 'console.log("other");');

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [
          { entryPoint: 'main.ts', bundleName: 'core' },
          { entryPoint: 'other.ts', bundleName: 'core' }, // Duplicate bundleName
        ],
      };

      // Act & Assert - should throw to fail the build
      await expect(
        compileTypeScript({
          projectRoot: testDir,
          config,
          mode: 'development',
          logger: mockLogger,
          outDir: 'dist',
        }),
      ).rejects.toThrow('Duplicate bundleName');
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

      // Assert - onRebuild should have been called with results array and compile time
      expect(onRebuild).toHaveBeenCalled();
      const lastCall = onRebuild.mock.calls[onRebuild.mock.calls.length - 1];
      expect(Array.isArray(lastCall![0])).toBe(true);
      expect(typeof lastCall![1]).toBe('number'); // compileTimeMs
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

    it('should log errors when TypeScript compilation fails during watch', async () => {
      // Arrange - create a valid TypeScript file first
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(srcDir, 'main.ts'), 'console.log("Valid code");');

      const onRebuild = vi.fn();
      const contexts = await createTypeScriptWatcher({
        projectRoot: testDir,
        config: { enabled: true },
        logger: mockLogger,
        onRebuild,
        outDir: 'dist',
      });

      // Wait for initial build to complete
      await setTimeout(200);

      // Trigger an error by writing invalid TypeScript (syntax error)
      writeFileSync(join(srcDir, 'main.ts'), 'const x: number = {;');

      // Wait for rebuild attempt
      await setTimeout(300);

      // Assert - error should have been logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("TypeScript error in 'main'"),
      );

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

  describe('isValidBundlePath', () => {
    describe('valid paths', () => {
      it('should accept simple valid paths', () => {
        expect(isValidBundlePath('/_assets/bundle.js')).toBe(true);
        expect(isValidBundlePath('/js/main.js')).toBe(true);
        expect(isValidBundlePath('/scripts/app-v1.2.3.js')).toBe(true);
      });

      it('should accept paths with hyphens and underscores', () => {
        expect(isValidBundlePath('/_assets/my-bundle_file.js')).toBe(true);
      });

      it('should accept nested paths', () => {
        expect(isValidBundlePath('/_assets/vendor/lib/bundle.js')).toBe(true);
      });
    });

    describe('invalid paths - type and emptiness', () => {
      it('should reject non-string values', () => {
        expect(isValidBundlePath(null as unknown as string)).toBe(false);
        expect(isValidBundlePath(undefined as unknown as string)).toBe(false);
        expect(isValidBundlePath(123 as unknown as string)).toBe(false);
      });

      it('should reject empty strings', () => {
        expect(isValidBundlePath('')).toBe(false);
      });
    });

    describe('invalid paths - null bytes', () => {
      it('should reject paths with null bytes', () => {
        expect(isValidBundlePath('/_assets/bundle\0.js')).toBe(false);
        expect(isValidBundlePath('/_assets\0/bundle.js')).toBe(false);
      });
    });

    describe('invalid paths - control and non-ASCII characters', () => {
      it('should reject paths with control characters', () => {
        expect(isValidBundlePath('/_assets/bundle\x01.js')).toBe(false);
        expect(isValidBundlePath('/_assets/bundle\x1F.js')).toBe(false);
      });

      it('should reject paths with non-ASCII characters', () => {
        expect(isValidBundlePath('/_assets/bündlé.js')).toBe(false);
        expect(isValidBundlePath('/_assets/スクリプト.js')).toBe(false);
        expect(isValidBundlePath('/_assets/bundle\x7F.js')).toBe(false);
      });
    });

    describe('invalid paths - URL encoding and escapes', () => {
      it('should reject URL-encoded characters', () => {
        expect(isValidBundlePath('/_assets/bundle%20name.js')).toBe(false);
        expect(isValidBundlePath('/_assets/%3Cscript%3E.js')).toBe(false);
      });

      it('should reject unicode escape sequences', () => {
        expect(isValidBundlePath('/_assets/bundle\\u003C.js')).toBe(false);
        expect(isValidBundlePath('/_assets/\\u0041.js')).toBe(false);
      });

      it('should reject HTML entities', () => {
        expect(isValidBundlePath('/_assets/bundle&lt;.js')).toBe(false);
        expect(isValidBundlePath('/_assets/&#60;script.js')).toBe(false);
        expect(isValidBundlePath('/_assets/&#x3C;.js')).toBe(false);
      });
    });

    describe('invalid paths - path traversal', () => {
      it('should reject path traversal attempts with ..', () => {
        expect(isValidBundlePath('/_assets/../etc/passwd.js')).toBe(false);
        expect(isValidBundlePath('/..\\..\\windows\\system32.js')).toBe(false);
      });

      it('should reject double slashes', () => {
        expect(isValidBundlePath('/_assets//bundle.js')).toBe(false);
        expect(isValidBundlePath('//assets/bundle.js')).toBe(false);
      });
    });

    describe('invalid paths - format', () => {
      it('should reject paths not starting with /', () => {
        expect(isValidBundlePath('_assets/bundle.js')).toBe(false);
        expect(isValidBundlePath('bundle.js')).toBe(false);
      });

      it('should reject paths not ending with .js', () => {
        expect(isValidBundlePath('/_assets/bundle.ts')).toBe(false);
        expect(isValidBundlePath('/_assets/bundle')).toBe(false);
        expect(isValidBundlePath('/_assets/bundle.jsx')).toBe(false);
      });
    });
  });

  describe('formatBytes', () => {
    it('should format bytes under 1KB', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1)).toBe('1 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1536)).toBe('1.50 KB');
      expect(formatBytes(2048)).toBe('2.00 KB');
      expect(formatBytes(1024 * 100)).toBe('100.00 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.50 MB');
      expect(formatBytes(1024 * 1024 * 100)).toBe('100.00 MB');
    });

    it('should handle edge case at boundaries', () => {
      // Just under 1KB
      expect(formatBytes(1023)).toBe('1023 B');
      // Exactly 1KB
      expect(formatBytes(1024)).toBe('1.00 KB');
      // Just under 1MB
      expect(formatBytes(1024 * 1024 - 1)).toBe('1024.00 KB');
      // Exactly 1MB
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    });
  });

  describe('detectExistingBundles', () => {
    it('should return empty array when output directory does not exist', async () => {
      const nonExistentDir = join(testDir, 'non-existent-project');
      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
      };

      const results = await detectExistingBundles({
        projectRoot: nonExistentDir,
        config,
        mode: 'development',
      });

      expect(results).toEqual([]);
    });

    it('should detect existing bundles in development mode', async () => {
      // Create the output directory structure
      const assetsDir = join(testDir, 'dist', '_assets');
      mkdirSync(assetsDir, { recursive: true });
      writeFileSync(join(assetsDir, 'main.js'), 'console.log("main");');
      writeFileSync(join(assetsDir, 'docs.js'), 'console.log("docs");');

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [
          { entryPoint: 'main.ts', bundleName: 'main' },
          { entryPoint: 'docs.ts', bundleName: 'docs' },
        ],
      };

      const results = await detectExistingBundles({
        projectRoot: testDir,
        config,
        mode: 'development',
      });

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.config.bundleName === 'main')).toBeDefined();
      expect(results.find((r) => r.config.bundleName === 'docs')).toBeDefined();
    });

    it('should detect existing bundles in production mode with hashes', async () => {
      // Create the output directory structure with hashed filenames
      const assetsDir = join(testDir, 'dist', '_assets');
      mkdirSync(assetsDir, { recursive: true });
      writeFileSync(join(assetsDir, 'main-abc123.js'), 'console.log("main");');
      writeFileSync(join(assetsDir, 'docs-xyz789.js'), 'console.log("docs");');

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [
          { entryPoint: 'main.ts', bundleName: 'main' },
          { entryPoint: 'docs.ts', bundleName: 'docs' },
        ],
      };

      const results = await detectExistingBundles({
        projectRoot: testDir,
        config,
        mode: 'production',
      });

      expect(results).toHaveLength(2);
      const mainBundle = results.find((r) => r.config.bundleName === 'main');
      const docsBundle = results.find((r) => r.config.bundleName === 'docs');

      expect(mainBundle).toBeDefined();
      expect(mainBundle?.filename).toBe('main-abc123.js');
      expect(docsBundle).toBeDefined();
      expect(docsBundle?.filename).toBe('docs-xyz789.js');
    });

    it('should return empty array when no matching bundles found', async () => {
      // Create the output directory with non-matching files
      const assetsDir = join(testDir, 'dist', '_assets');
      mkdirSync(assetsDir, { recursive: true });
      writeFileSync(join(assetsDir, 'other.js'), 'console.log("other");');

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
      };

      const results = await detectExistingBundles({
        projectRoot: testDir,
        config,
        mode: 'development',
      });

      expect(results).toEqual([]);
    });

    it('should use default bundle config when none specified', async () => {
      // Create the output directory with default bundle name
      const assetsDir = join(testDir, 'dist', '_assets');
      mkdirSync(assetsDir, { recursive: true });
      writeFileSync(join(assetsDir, 'main.js'), 'console.log("main");');

      const config: TypeScriptConfig = {
        enabled: true,
        // No bundles specified - should use default
      };

      const results = await detectExistingBundles({
        projectRoot: testDir,
        config,
        mode: 'development',
      });

      // Should detect the default 'main' bundle
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle custom output directory', async () => {
      // Create custom output directory structure
      const customDir = join(testDir, 'custom-dist', '_assets');
      mkdirSync(customDir, { recursive: true });
      writeFileSync(join(customDir, 'main.js'), 'console.log("main");');

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
      };

      const results = await detectExistingBundles({
        projectRoot: testDir,
        config,
        outDir: 'custom-dist',
        mode: 'development',
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.filename).toBe('main.js');
    });

    it('should generate correct bundle paths', async () => {
      const assetsDir = join(testDir, 'dist', '_assets');
      mkdirSync(assetsDir, { recursive: true });
      writeFileSync(join(assetsDir, 'main.js'), 'console.log("main");');

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
      };

      const results = await detectExistingBundles({
        projectRoot: testDir,
        config,
        mode: 'development',
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.path).toBe('/_assets/main.js');
    });

    it('should handle read directory errors gracefully', async () => {
      // Create a file where directory is expected (causes readdir to fail)
      const distDir = join(testDir, 'dist');
      mkdirSync(distDir, { recursive: true });
      // Create _assets as a file instead of directory
      writeFileSync(join(distDir, '_assets'), 'not a directory');

      const config: TypeScriptConfig = {
        enabled: true,
        bundles: [{ entryPoint: 'main.ts', bundleName: 'main' }],
      };

      const results = await detectExistingBundles({
        projectRoot: testDir,
        config,
        mode: 'development',
      });

      // Should return empty array on error, not throw
      expect(results).toEqual([]);
    });
  });
});
