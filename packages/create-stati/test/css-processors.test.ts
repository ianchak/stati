import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, readFile, mkdir, access } from 'fs/promises';
import { CSSProcessor } from '../src/css-processors.js';

describe('CSSProcessor', () => {
  let tempDir: string;
  let cssProcessor: CSSProcessor;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-css-test-'));
    cssProcessor = new CSSProcessor();
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('processStyling', () => {
    it('should do nothing for css styling option', async () => {
      // Create initial package.json and CSS file
      const packageJson = {
        name: 'test-project',
        scripts: { dev: 'stati dev' },
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await mkdir(join(tempDir, 'public'), { recursive: true });
      await writeFile(join(tempDir, 'public', 'styles.css'), 'body { margin: 0; }');

      await cssProcessor.processStyling(tempDir, 'css');

      // Verify no changes were made
      const finalPackageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));
      expect(finalPackageJson).toEqual(packageJson);

      const cssContent = await readFile(join(tempDir, 'public', 'styles.css'), 'utf-8');
      expect(cssContent).toBe('body { margin: 0; }');
    });

    it('should throw error for unsupported styling option', async () => {
      await expect(cssProcessor.processStyling(tempDir, 'unknown' as 'css')).rejects.toThrow(
        'Unsupported styling option: unknown',
      );
    });
  });

  describe('setupSass', () => {
    beforeEach(async () => {
      // Create initial structure
      const packageJson = {
        name: 'test-project',
        scripts: {
          dev: 'stati dev',
          build: 'stati build',
        },
        devDependencies: {
          '@stati/cli': '^1.0.0',
          '@stati/core': '^1.0.0',
        },
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await mkdir(join(tempDir, 'public'), { recursive: true });
      await writeFile(
        join(tempDir, 'public', 'styles.css'),
        'body { margin: 0; color: #007bff; background: #6c757d; }',
      );
    });

    it('should setup Sass with enhanced SCSS file', async () => {
      await cssProcessor.processStyling(tempDir, 'sass');

      // Verify styles directory and SCSS file were created
      await expect(access(join(tempDir, 'styles', 'main.scss'))).resolves.not.toThrow();

      const scssContent = await readFile(join(tempDir, 'styles', 'main.scss'), 'utf-8');

      // Verify SCSS has variables and enhanced features
      expect(scssContent).toContain('$primary-color: #007bff;');
      expect(scssContent).toContain('$secondary-color: #6c757d;');
      expect(scssContent).toContain('$font-stack: -apple-system');
      expect(scssContent).toContain('@mixin responsive($breakpoint)');
      expect(scssContent).toContain('$primary-color'); // Variables are used
      expect(scssContent).toContain('$secondary-color');
    });

    it('should add Sass dependencies to package.json', async () => {
      await cssProcessor.processStyling(tempDir, 'sass');

      const packageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));

      expect(packageJson.devDependencies).toHaveProperty('sass');
      expect(packageJson.devDependencies).toHaveProperty('concurrently');
      expect(packageJson.devDependencies['@stati/cli']).toBe('^1.0.0'); // Preserved
      expect(packageJson.devDependencies['@stati/core']).toBe('^1.0.0'); // Preserved
    });

    it('should add Sass build scripts to package.json', async () => {
      await cssProcessor.processStyling(tempDir, 'sass');

      const packageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));

      expect(packageJson.scripts).toHaveProperty('build:css');
      expect(packageJson.scripts).toHaveProperty('watch:css');
      expect(packageJson.scripts['build:css']).toContain('sass styles/main.scss public/styles.css');
      expect(packageJson.scripts['watch:css']).toContain(
        'sass styles/main.scss public/styles.css --watch',
      );

      // Scripts should be modified to integrate CSS processing
      expect(packageJson.scripts.dev).toBe(
        'concurrently --prefix none "npm run watch:css" "stati dev"',
      );
      expect(packageJson.scripts.build).toBe('npm run build:css && stati build');
    });

    it('should remove original CSS file after creating SCSS', async () => {
      await cssProcessor.processStyling(tempDir, 'sass');

      // Original CSS file should be removed
      await expect(access(join(tempDir, 'public', 'styles.css'))).rejects.toThrow();
    });
  });

  describe('setupTailwind', () => {
    beforeEach(async () => {
      // Create initial structure
      const packageJson = {
        name: 'test-project',
        scripts: {
          dev: 'stati dev',
          build: 'stati build',
        },
        devDependencies: {
          '@stati/cli': '^1.0.0',
          '@stati/core': '^1.0.0',
        },
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await mkdir(join(tempDir, 'public'), { recursive: true });
      await writeFile(join(tempDir, 'public', 'styles.css'), 'body { margin: 0; }');
    });

    it('should create Tailwind CSS file with directives', async () => {
      await cssProcessor.processStyling(tempDir, 'tailwind');

      const cssContent = await readFile(join(tempDir, 'src', 'styles.css'), 'utf-8');

      expect(cssContent).toContain('@tailwind base;');
      expect(cssContent).toContain('@tailwind components;');
      expect(cssContent).toContain('@tailwind utilities;');
      expect(cssContent).toContain('@layer components');
    });

    it('should create tailwind.config.js file', async () => {
      await cssProcessor.processStyling(tempDir, 'tailwind');

      await expect(access(join(tempDir, 'tailwind.config.js'))).resolves.not.toThrow();

      const configContent = await readFile(join(tempDir, 'tailwind.config.js'), 'utf-8');
      expect(configContent).toContain('./site/**/*.{md,eta,html}');
      expect(configContent).toContain('./.stati/tailwind-classes.html');
      expect(configContent).toContain('theme: {');
      expect(configContent).toContain('plugins: []');
    });

    it('should add Tailwind dependencies to package.json', async () => {
      await cssProcessor.processStyling(tempDir, 'tailwind');

      const packageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));

      expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
      expect(packageJson.devDependencies).toHaveProperty('autoprefixer');
      expect(packageJson.devDependencies).toHaveProperty('postcss');
      expect(packageJson.devDependencies).toHaveProperty('concurrently');

      // Preserved dependencies
      expect(packageJson.devDependencies['@stati/cli']).toBe('^1.0.0');
      expect(packageJson.devDependencies['@stati/core']).toBe('^1.0.0');
    });

    it('should add Tailwind build scripts to package.json', async () => {
      await cssProcessor.processStyling(tempDir, 'tailwind');

      const packageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));

      expect(packageJson.scripts).toHaveProperty('build:css');
      expect(packageJson.scripts).toHaveProperty('watch:css');
      expect(packageJson.scripts['build:css']).toContain('stati tailwindcss:build');
      expect(packageJson.scripts['watch:css']).toContain('stati tailwindcss:watch');

      // Verify input/output paths
      expect(packageJson.scripts['build:css']).toContain('-i src/styles.css -o public/styles.css');
      expect(packageJson.scripts['watch:css']).toContain('-i src/styles.css -o public/styles.css');

      // Verify build script includes minify flag
      expect(packageJson.scripts['build:css']).toContain('--minify');

      // Scripts should be modified to integrate CSS processing
      expect(packageJson.scripts.dev).toBe(
        'concurrently --prefix none "npm run watch:css" "stati dev"',
      );
      expect(packageJson.scripts.build).toBe(
        'stati build && npm run build:css && npm run copy:css',
      );
      expect(packageJson.scripts['copy:css']).toContain('copyFileSync');
    });
  });

  describe('error handling', () => {
    it('should handle missing package.json gracefully', async () => {
      // No package.json file created
      await expect(cssProcessor.processStyling(tempDir, 'sass')).rejects.toThrow();
    });

    it('should handle missing CSS file for Sass setup', async () => {
      const packageJson = { name: 'test', scripts: {} };
      await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // No public/styles.css file created
      await expect(cssProcessor.processStyling(tempDir, 'sass')).rejects.toThrow();
    });

    it('should throw descriptive error when Tailwind setup fails', async () => {
      const packageJson = { name: 'test', scripts: {} };
      await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create src directory but make it read-only to force write failure
      await mkdir(join(tempDir, 'src'), { recursive: true });

      if (process.platform !== 'win32') {
        const { chmod } = await import('fs/promises');
        await chmod(join(tempDir, 'src'), 0o444); // read-only

        try {
          await expect(cssProcessor.processStyling(tempDir, 'tailwind')).rejects.toThrow(
            /Failed to setup Tailwind/,
          );
        } finally {
          // Restore permissions for cleanup
          await chmod(join(tempDir, 'src'), 0o755);
        }
      } else {
        // On Windows, permissions work differently
        // We'll skip this specific test on Windows as it's hard to simulate
        // The error path is still covered on Unix systems
        expect(true).toBe(true); // Placeholder to keep test valid
      }
    });
  });
});
