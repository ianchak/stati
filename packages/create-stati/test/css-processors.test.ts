import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { processStyling } from '../src/css-processors.js';
import type { StylingOption } from '../src/css-processors.js';

describe('CSSProcessor', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-css-test-'));
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

      await processStyling(tempDir, 'css');

      // Verify no changes were made
      const finalPackageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));
      expect(finalPackageJson).toEqual(packageJson);

      const cssContent = await readFile(join(tempDir, 'public', 'styles.css'), 'utf-8');
      expect(cssContent).toBe('body { margin: 0; }');
    });

    it('should throw error for unsupported styling option', async () => {
      await expect(processStyling(tempDir, 'unknown' as StylingOption)).rejects.toThrow(
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
        'body { margin: 0; color: #2563eb; background: #475569; }',
      );
    });

    it('should setup Sass with enhanced SCSS file', async () => {
      await processStyling(tempDir, 'sass');

      // Verify src directory and SCSS file were created
      await expect(access(join(tempDir, 'src', 'styles.scss'))).resolves.not.toThrow();

      const scssContent = await readFile(join(tempDir, 'src', 'styles.scss'), 'utf-8');

      // Verify SCSS has variables and enhanced features
      expect(scssContent).toContain('$primary-color: #2563eb;');
      expect(scssContent).toContain('$secondary-color: #475569;');
      expect(scssContent).toContain('$font-stack: ui-sans-serif');
      expect(scssContent).toContain('@mixin responsive($breakpoint)');
      expect(scssContent).toContain('$primary-color'); // Variables are used
      expect(scssContent).toContain('$secondary-color');
    });

    it('should add Sass dependencies to package.json', async () => {
      await processStyling(tempDir, 'sass');

      const packageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));

      expect(packageJson.devDependencies).toHaveProperty('sass');
      expect(packageJson.devDependencies).toHaveProperty('concurrently');
      expect(packageJson.devDependencies['@stati/cli']).toBe('^1.0.0'); // Preserved
      expect(packageJson.devDependencies['@stati/core']).toBe('^1.0.0'); // Preserved
    });

    it('should add Sass build scripts to package.json', async () => {
      await processStyling(tempDir, 'sass');

      const packageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));

      expect(packageJson.scripts).toHaveProperty('build:css');
      expect(packageJson.scripts).toHaveProperty('watch:css');
      expect(packageJson.scripts['build:css']).toContain('sass src/styles.scss dist/styles.css');
      expect(packageJson.scripts['watch:css']).toContain(
        'sass src/styles.scss dist/styles.css --watch',
      );

      // Scripts should be modified to integrate CSS processing
      expect(packageJson.scripts.dev).toBe(
        'concurrently --prefix none "npm run watch:css" "stati dev"',
      );
      expect(packageJson.scripts.build).toBe('stati build && npm run build:css');
    });

    it('should remove original CSS file after creating SCSS', async () => {
      await processStyling(tempDir, 'sass');

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

    it('should create Tailwind CSS file with the Tailwind import', async () => {
      await processStyling(tempDir, 'tailwind');

      const cssContent = await readFile(join(tempDir, 'src', 'styles.css'), 'utf-8');

      expect(cssContent).toContain("@import 'tailwindcss';");
      expect(cssContent).toContain("@source '../.stati/tailwind-classes.html';");
      expect(cssContent).toContain('@layer components');
    });

    it('should not create tailwind.config.js', async () => {
      await processStyling(tempDir, 'tailwind');

      await expect(access(join(tempDir, 'tailwind.config.js'))).rejects.toThrow();
    });

    it('should add Tailwind dependencies to package.json', async () => {
      await processStyling(tempDir, 'tailwind');

      const packageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));

      expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
      expect(packageJson.devDependencies).toHaveProperty('@tailwindcss/cli');
      expect(packageJson.devDependencies).not.toHaveProperty('autoprefixer');
      expect(packageJson.devDependencies).not.toHaveProperty('postcss');
      expect(packageJson.devDependencies).not.toHaveProperty('concurrently');

      // Preserved dependencies
      expect(packageJson.devDependencies['@stati/cli']).toBe('^1.0.0');
      expect(packageJson.devDependencies['@stati/core']).toBe('^1.0.0');
    });

    it('should add Tailwind build scripts to package.json', async () => {
      await processStyling(tempDir, 'tailwind');

      const packageJson = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'));

      // Both commands run Tailwind themselves
      expect(packageJson.scripts.dev).toBe(
        'stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css',
      );
      expect(packageJson.scripts.build).toBe(
        'stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css',
      );
      expect(packageJson.scripts).not.toHaveProperty('build:css');
      expect(packageJson.scripts).not.toHaveProperty('copy:css');
    });

    it("should remove the templates' link to /styles.css, which Stati adds itself", async () => {
      const head = '<head>\n  <link rel="icon" href="/favicon.svg" />\n';
      await mkdir(join(tempDir, 'site', 'partials'), { recursive: true });
      await writeFile(
        join(tempDir, 'site', 'partials', 'head.eta'),
        `${head}  <link rel="stylesheet" href="/styles.css" />\n</head>\n`,
      );
      await writeFile(join(tempDir, 'site', 'layout.eta'), '<%~ stati.include("partials/head") %>');

      await processStyling(tempDir, 'tailwind');

      expect(await readFile(join(tempDir, 'site', 'partials', 'head.eta'), 'utf-8')).toBe(
        `${head}</head>\n`,
      );
      expect(await readFile(join(tempDir, 'site', 'layout.eta'), 'utf-8')).toBe(
        '<%~ stati.include("partials/head") %>',
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing package.json gracefully', async () => {
      // No package.json file created
      await expect(processStyling(tempDir, 'sass')).rejects.toThrow();
    });

    it('should handle missing CSS file for Sass setup', async () => {
      const packageJson = { name: 'test', scripts: {} };
      await writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // No public/styles.css file created
      await expect(processStyling(tempDir, 'sass')).rejects.toThrow();
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
          await expect(processStyling(tempDir, 'tailwind')).rejects.toThrow(
            /Failed to setup tailwind/i,
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
