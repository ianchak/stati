import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, access, readFile } from 'fs/promises';
import { createSite } from '../src/create.js';
import type { CreateOptions } from '../src/create.js';

describe('create-stati scaffolding', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('createSite', () => {
    it('should create a blank project with default CSS', async () => {
      const projectDir = join(tempDir, 'test-blank');
      const options: CreateOptions = {
        projectName: 'test-blank',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        dir: projectDir,
      };

      const result = await createSite(options);

      expect(result.projectName).toBe('test-blank');
      expect(result.targetDir).toBe(projectDir);

      // Verify essential files exist
      await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'stati.config.js'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'site', 'index.md'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'site', 'layout.eta'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'public', 'styles.css'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'public', 'favicon.svg'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'README.md'))).resolves.not.toThrow();

      // Verify package.json was modified correctly
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.name).toBe('test-blank');
      expect(packageJson.devDependencies).toHaveProperty('@stati/cli');
      expect(packageJson.devDependencies).toHaveProperty('@stati/core');
    });

    it('should create a project with Sass styling', async () => {
      const projectDir = join(tempDir, 'test-sass');
      const options: CreateOptions = {
        projectName: 'test-sass',
        template: 'blank',
        styling: 'sass',
        gitInit: false,
        dir: projectDir,
      };

      const result = await createSite(options);

      // Verify Sass-specific files and configuration
      await expect(access(join(result.targetDir, 'styles', 'main.scss'))).resolves.not.toThrow();

      // Verify package.json has Sass dependencies
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.name).toBe('test-sass');
      expect(packageJson.devDependencies).toHaveProperty('sass');
      expect(packageJson.devDependencies).toHaveProperty('concurrently');
      expect(packageJson.scripts).toHaveProperty('build:css');
      expect(packageJson.scripts).toHaveProperty('watch:css');

      // Verify Sass content
      const scssContent = await readFile(join(result.targetDir, 'styles', 'main.scss'), 'utf-8');
      expect(scssContent).toContain('$primary-color');
      expect(scssContent).toContain('$font-stack');
      expect(scssContent).toContain('@mixin responsive');
    });

    it('should create a project with Tailwind styling', async () => {
      const projectDir = join(tempDir, 'test-tailwind');
      const options: CreateOptions = {
        projectName: 'test-tailwind',
        template: 'blank',
        styling: 'tailwind',
        gitInit: false,
        dir: projectDir,
      };

      const result = await createSite(options);

      // Verify Tailwind-specific files and configuration
      await expect(access(join(result.targetDir, 'tailwind.config.js'))).resolves.not.toThrow();

      // Verify package.json has Tailwind dependencies
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.name).toBe('test-tailwind');
      expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
      expect(packageJson.devDependencies).toHaveProperty('autoprefixer');
      expect(packageJson.devDependencies).toHaveProperty('postcss');
      expect(packageJson.devDependencies).toHaveProperty('concurrently');

      // Verify Tailwind CSS content
      const cssContent = await readFile(join(result.targetDir, 'src', 'styles.css'), 'utf-8');
      expect(cssContent).toContain('@tailwind base');
      expect(cssContent).toContain('@tailwind components');
      expect(cssContent).toContain('@tailwind utilities');
      expect(cssContent).toContain('@layer components');

      // Verify Tailwind config
      const configContent = await readFile(join(result.targetDir, 'tailwind.config.js'), 'utf-8');
      expect(configContent).toContain("content: ['./site/**/*.{md,eta,html}']");
    });

    it('should initialize git repository when requested', async () => {
      const projectDir = join(tempDir, 'test-git');
      const options: CreateOptions = {
        projectName: 'test-git',
        template: 'blank',
        styling: 'css',
        gitInit: true,
        dir: projectDir,
      };

      // Mock console.warn to avoid git error messages in test output
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await createSite(options);

      // Verify .gitignore was created
      await expect(access(join(result.targetDir, '.gitignore'))).resolves.not.toThrow();

      const gitignoreContent = await readFile(join(result.targetDir, '.gitignore'), 'utf-8');
      expect(gitignoreContent).toContain('node_modules/');
      expect(gitignoreContent).toContain('dist/');
      expect(gitignoreContent).toContain('.stati/');
      expect(gitignoreContent).toContain('public/styles.css');
      expect(gitignoreContent).toContain('# Generated CSS files');

      consoleSpy.mockRestore();
    });

    it('should handle custom directory option', async () => {
      const customDir = join(tempDir, 'custom-location');
      const options: CreateOptions = {
        projectName: 'test-custom',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        dir: customDir,
      };

      const result = await createSite(options);

      expect(result.targetDir).toBe(customDir);
      expect(result.projectName).toBe('test-custom');

      // Verify project was created in custom location
      await expect(access(join(customDir, 'package.json'))).resolves.not.toThrow();

      const packageJson = JSON.parse(await readFile(join(customDir, 'package.json'), 'utf-8'));
      expect(packageJson.name).toBe('test-custom');
    });

    it('should throw error if directory already exists', async () => {
      const projectDir = join(tempDir, 'test-exists');
      const options: CreateOptions = {
        projectName: 'test-exists',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        dir: projectDir,
      };

      // Create the project first
      await createSite(options);

      // Try to create again - should fail
      await expect(createSite(options)).rejects.toThrow('already exists');
    });

    it('should handle validation correctly', async () => {
      const projectDir = join(tempDir, 'test-validation');

      // Test that empty project names are accepted (validation is in CLI layer)
      const options: CreateOptions = {
        projectName: '',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        dir: projectDir,
      };

      // This should succeed - empty name is valid at the core level
      const result = await createSite(options);
      expect(result.projectName).toBe('');

      // Verify package.json has empty name
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.name).toBe('');
    });
  });
});
