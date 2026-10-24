import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm, access, readFile, writeFile, mkdir } from 'node:fs/promises';
import {
  createSite,
  ProjectScaffolder,
  detectAvailablePackageManagers,
  adaptTemplateConfig,
} from '../src/create.js';
import type { CreateOptions } from '../src/create.js';
import { ExampleManager } from '../src/examples.js';
import { copyAgentSkill } from '../src/agent-skill.js';

// Wrap the real implementation so individual tests can force a failure
vi.mock('../src/agent-skill.js', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../src/agent-skill.js');
  return { ...actual, copyAgentSkill: vi.fn(actual.copyAgentSkill) };
});

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

    it('should install the agent skill when requested', async () => {
      const projectDir = join(tempDir, 'test-skill');
      const result = await createSite({
        projectName: 'test-skill',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        agentSkill: 'claude',
        dir: projectDir,
      });

      expect(result.agentSkillDir).toBe('.claude/skills/stati');
      await expect(
        access(join(result.targetDir, '.claude', 'skills', 'stati', 'SKILL.md')),
      ).resolves.not.toThrow();
    });

    it('should still create the site but not report the agent skill when copying fails', async () => {
      vi.mocked(copyAgentSkill).mockRejectedValueOnce(new Error('skill missing'));
      const projectDir = join(tempDir, 'test-skill-fail');
      const result = await createSite({
        projectName: 'test-skill-fail',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        agentSkill: 'claude',
        dir: projectDir,
      });

      expect(result.agentSkillDir).toBeUndefined();
      await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();
    });

    it('should not install the agent skill by default', async () => {
      const projectDir = join(tempDir, 'test-no-skill');
      const result = await createSite({
        projectName: 'test-no-skill',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        dir: projectDir,
      });

      await expect(access(join(result.targetDir, '.claude'))).rejects.toThrow();
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
      await expect(access(join(result.targetDir, 'src', 'styles.scss'))).resolves.not.toThrow();

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
      const scssContent = await readFile(join(result.targetDir, 'src', 'styles.scss'), 'utf-8');
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

      // Tailwind CSS 4 is configured in the stylesheet
      await expect(access(join(result.targetDir, 'tailwind.config.js'))).rejects.toThrow();

      // Verify package.json has Tailwind dependencies
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.name).toBe('test-tailwind');
      expect(packageJson.devDependencies).toHaveProperty('tailwindcss');
      expect(packageJson.devDependencies).toHaveProperty('@tailwindcss/cli');
      expect(packageJson.devDependencies).not.toHaveProperty('autoprefixer');
      expect(packageJson.devDependencies).not.toHaveProperty('postcss');
      expect(packageJson.devDependencies).not.toHaveProperty('concurrently');

      // Verify Tailwind CSS content, including the inventory file Tailwind must scan
      const cssContent = await readFile(join(result.targetDir, 'src', 'styles.css'), 'utf-8');
      expect(cssContent).toContain("@import 'tailwindcss';");
      expect(cssContent).toContain("@source '../.stati/tailwind-classes.html';");
      expect(cssContent).toContain('@layer components');
    });

    it('should create a project with TypeScript enabled', async () => {
      const projectDir = join(tempDir, 'test-typescript');
      const options: CreateOptions = {
        projectName: 'test-typescript',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        typescript: true,
        dir: projectDir,
      };

      const result = await createSite(options);

      // Verify TypeScript-specific files exist
      await expect(access(join(result.targetDir, 'stati.config.ts'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'tsconfig.json'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'src', 'main.ts'))).resolves.not.toThrow();

      // Verify JavaScript config was NOT created
      await expect(access(join(result.targetDir, 'stati.config.js'))).rejects.toThrow();

      // Verify package.json has TypeScript dependencies
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.name).toBe('test-typescript');
      expect(packageJson.devDependencies).toHaveProperty('typescript');
      expect(packageJson.scripts).toHaveProperty('typecheck');

      // Verify stati.config.ts content
      const statiConfig = await readFile(join(result.targetDir, 'stati.config.ts'), 'utf-8');
      expect(statiConfig).toContain("import { defineConfig } from '@stati/core'");
      expect(statiConfig).toContain('typescript:');
      expect(statiConfig).toContain('enabled: true');

      // Verify tsconfig.json content
      const tsconfigContent = await readFile(join(result.targetDir, 'tsconfig.json'), 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noEmit).toBe(true);

      // Verify main.ts content
      const mainTs = await readFile(join(result.targetDir, 'src', 'main.ts'), 'utf-8');
      expect(mainTs).toContain('console.log');
    });

    it('should create a project with TypeScript disabled (JavaScript config)', async () => {
      const projectDir = join(tempDir, 'test-javascript');
      const options: CreateOptions = {
        projectName: 'test-javascript',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        typescript: false,
        dir: projectDir,
      };

      const result = await createSite(options);

      // Verify JavaScript config exists
      await expect(access(join(result.targetDir, 'stati.config.js'))).resolves.not.toThrow();

      // Verify TypeScript files do NOT exist
      await expect(access(join(result.targetDir, 'stati.config.ts'))).rejects.toThrow();
      await expect(access(join(result.targetDir, 'tsconfig.json'))).rejects.toThrow();
      await expect(access(join(result.targetDir, 'src', 'main.ts'))).rejects.toThrow();

      // Verify package.json does NOT have TypeScript dependencies
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.devDependencies).not.toHaveProperty('typescript');
      expect(packageJson.scripts).not.toHaveProperty('typecheck');

      // Verify stati.config.js content
      const statiConfig = await readFile(join(result.targetDir, 'stati.config.js'), 'utf-8');
      expect(statiConfig).toContain("import { defineConfig } from '@stati/core'");
      expect(statiConfig).not.toContain('typescript:');
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
      expect(gitignoreContent).not.toContain('public/styles.css');

      consoleSpy.mockRestore();
    });

    it('should ignore the stylesheet Sass compiles into public/', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await createSite({
        projectName: 'test-git-sass',
        template: 'blank',
        styling: 'sass',
        gitInit: true,
        dir: join(tempDir, 'test-git-sass'),
      });

      const gitignoreContent = await readFile(join(result.targetDir, '.gitignore'), 'utf-8');
      expect(gitignoreContent).toContain(
        '# Compiled from src/styles.scss before each build\npublic/styles.css\n',
      );

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

    it('should skip dependency installation when install is false', async () => {
      const projectDir = join(tempDir, 'test-no-install');

      // Ensure clean state - remove directory if it exists from previous runs
      try {
        await rm(projectDir, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, which is fine
      }

      const options: CreateOptions = {
        projectName: 'test-no-install',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: false,
        dir: projectDir,
      };

      const result = await createSite(options);

      // Project should be created successfully
      expect(result.projectName).toBe('test-no-install');
      await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();

      // node_modules should not exist
      await expect(access(join(result.targetDir, 'node_modules'))).rejects.toThrow();
    });

    it('should handle dependency installation gracefully when install is true', async () => {
      const projectDir = join(tempDir, 'test-with-install');

      // Ensure clean state - remove directory if it exists from previous runs
      try {
        await rm(projectDir, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, which is fine
      }

      const options: CreateOptions = {
        projectName: 'test-with-install',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        dir: projectDir,
      };

      // Mock console to capture installation messages
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await createSite(options);

      // Project should be created successfully
      expect(result.projectName).toBe('test-with-install');
      await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();

      // Installation might fail in test environment, but that's okay - it should warn, not throw
      // The test passes as long as the project is created

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }, 30000); // Increase timeout to 30 seconds for npm install

    it('should use specified package manager when provided', async () => {
      const projectDir = join(tempDir, 'test-with-pnpm');
      const options: CreateOptions = {
        projectName: 'test-with-pnpm',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        packageManager: 'pnpm',
        dir: projectDir,
      };

      // Mock console to capture installation messages
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await createSite(options);

      // Project should be created successfully
      expect(result.projectName).toBe('test-with-pnpm');
      await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();

      // Check that the console log was called with pnpm
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installing dependencies with pnpm'),
      );

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }, 30000); // Increase timeout to 30 seconds for package manager install

    it('should throw error if file exists with same name as directory', async () => {
      const projectDir = join(tempDir, 'test-file-conflict');

      // Create a file instead of a directory
      await writeFile(projectDir, 'test content');

      const options: CreateOptions = {
        projectName: 'test-file-conflict',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        dir: projectDir,
      };

      // Should fail because a file exists with the same name
      await expect(createSite(options)).rejects.toThrow('file with the name');
    });

    it('should handle invalid package manager by throwing error', async () => {
      const projectDir = join(tempDir, 'test-invalid-pm');
      const options: CreateOptions = {
        projectName: 'test-invalid-pm',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        // @ts-expect-error - Testing invalid package manager
        packageManager: 'invalid-pm',
        dir: projectDir,
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should throw SECURITY error for invalid package manager
      await expect(createSite(options)).rejects.toThrow('SECURITY');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('blog template', () => {
    it('should keep the blog config, helpers and styles in a JavaScript project', async () => {
      const projectDir = join(tempDir, 'test-blog-js');
      const result = await createSite({
        projectName: 'test-blog-js',
        template: 'blog',
        styling: 'css',
        typescript: false,
        gitInit: false,
        dir: projectDir,
      });

      const config = await readFile(join(result.targetDir, 'stati.config.js'), 'utf-8');
      expect(config).toContain("import { createBlog } from './helpers/blog.js';");
      expect(config).toContain('rss:');
      expect(config).not.toContain('typescript:');
      await expect(access(join(result.targetDir, 'stati.config.ts'))).rejects.toThrow();
      await expect(access(join(result.targetDir, 'helpers', 'blog.js'))).resolves.not.toThrow();
      await expect(
        access(join(result.targetDir, 'site', 'posts', 'layout.eta')),
      ).resolves.not.toThrow();
      await expect(
        access(join(result.targetDir, 'public', 'fonts', 'young-serif.woff2')),
      ).resolves.not.toThrow();

      const styles = await readFile(join(result.targetDir, 'public', 'styles.css'), 'utf-8');
      expect(styles).toContain("font-family: 'Young Serif'");

      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.name).toBe('test-blog-js');
      expect(packageJson.scripts).toHaveProperty('build:drafts');
    });

    it('should convert the blog config to TypeScript and enable bundling', async () => {
      const projectDir = join(tempDir, 'test-blog-ts');
      const result = await createSite({
        projectName: 'test-blog-ts',
        template: 'blog',
        styling: 'css',
        typescript: true,
        gitInit: false,
        dir: projectDir,
      });

      await expect(access(join(result.targetDir, 'stati.config.js'))).rejects.toThrow();
      const config = await readFile(join(result.targetDir, 'stati.config.ts'), 'utf-8');
      expect(config).toContain("import { createBlog } from './helpers/blog.js';");
      expect(config).toMatch(/ {2}typescript: \{\n {4}enabled: true,\n {2}\},\n\}\);\n$/);
      await expect(access(join(result.targetDir, 'tsconfig.json'))).resolves.not.toThrow();
    });

    it('should keep the blog design when Tailwind is chosen', async () => {
      const projectDir = join(tempDir, 'test-blog-tailwind');
      const result = await createSite({
        projectName: 'test-blog-tailwind',
        template: 'blog',
        styling: 'tailwind',
        typescript: false,
        gitInit: false,
        dir: projectDir,
      });

      const css = await readFile(join(result.targetDir, 'src', 'styles.css'), 'utf-8');
      expect(css).toContain("@import 'tailwindcss';");
      expect(css).toContain('@layer components {\n');
      expect(css).toContain("font-family: 'Young Serif'");
      await expect(access(join(result.targetDir, 'public', 'styles.css'))).rejects.toThrow();
    });

    it('should keep the blog design when Sass is chosen', async () => {
      const projectDir = join(tempDir, 'test-blog-sass');
      const result = await createSite({
        projectName: 'test-blog-sass',
        template: 'blog',
        styling: 'sass',
        typescript: false,
        gitInit: false,
        dir: projectDir,
      });

      const scss = await readFile(join(result.targetDir, 'src', 'styles.scss'), 'utf-8');
      expect(scss).toContain("font-family: 'Young Serif'");
      await expect(access(join(result.targetDir, 'public', 'styles.css'))).rejects.toThrow();
    });

    it('should add image tools with the blog card template and its font', async () => {
      const projectDir = join(tempDir, 'test-blog-images');
      const result = await createSite({
        projectName: 'test-blog-images',
        template: 'blog',
        styling: 'css',
        typescript: false,
        images: true,
        gitInit: false,
        dir: projectDir,
      });

      const config = await readFile(join(result.targetDir, 'stati.config.js'), 'utf-8');
      expect(config).toContain('  images: {\n    responsive: true,\n    og: {\n');
      expect(config).toContain(
        "        { name: 'Young Serif', path: './og/fonts/young-serif-regular.woff', weight: 400 },",
      );
      // Stati leaves the 404 page out of Open Graph cards on its own
      expect(config).not.toContain("'/404'");
      expect(config).toMatch(/\n {2}\},\n\}\);\n$/);
      await expect(access(join(result.targetDir, 'site', 'og.eta'))).resolves.not.toThrow();
      await expect(
        access(join(result.targetDir, 'og', 'fonts', 'young-serif-regular.woff')),
      ).resolves.not.toThrow();

      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.devDependencies['@stati/images']).toBe('^1.0.0');
    });

    it('should remove the blog card template and fonts without image tools', async () => {
      const projectDir = join(tempDir, 'test-blog-no-images');
      const result = await createSite({
        projectName: 'test-blog-no-images',
        template: 'blog',
        styling: 'css',
        typescript: false,
        gitInit: false,
        dir: projectDir,
      });

      const config = await readFile(join(result.targetDir, 'stati.config.js'), 'utf-8');
      expect(config).not.toContain('images:');
      await expect(access(join(result.targetDir, 'site', 'og.eta'))).rejects.toThrow();
      await expect(access(join(result.targetDir, 'og'))).rejects.toThrow();
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.devDependencies).not.toHaveProperty('@stati/images');
    });
  });

  describe('docs template', () => {
    it('should keep the docs config, helpers, scripts and styles in a JavaScript project', async () => {
      const projectDir = join(tempDir, 'test-docs-js');
      const result = await createSite({
        projectName: 'test-docs-js',
        template: 'docs',
        styling: 'css',
        typescript: false,
        gitInit: false,
        dir: projectDir,
      });

      const config = await readFile(join(result.targetDir, 'stati.config.js'), 'utf-8');
      expect(config).toContain("import { createDocs } from './helpers/docs.js';");
      expect(config).toContain('search:');
      expect(config).not.toContain('typescript:');
      await expect(access(join(result.targetDir, 'stati.config.ts'))).rejects.toThrow();
      await expect(access(join(result.targetDir, 'helpers', 'docs.js'))).resolves.not.toThrow();
      await expect(access(join(result.targetDir, 'site', 'home.eta'))).resolves.not.toThrow();
      await expect(
        access(join(result.targetDir, 'site', 'partials', 'sidebar.eta')),
      ).resolves.not.toThrow();
      await expect(
        access(join(result.targetDir, 'site', 'getting-started', 'index.md')),
      ).resolves.not.toThrow();
      await expect(
        access(join(result.targetDir, 'public', 'scripts', 'docs.js')),
      ).resolves.not.toThrow();
      await expect(
        access(join(result.targetDir, 'public', 'fonts', 'inter-latin.woff2')),
      ).resolves.not.toThrow();

      const styles = await readFile(join(result.targetDir, 'public', 'styles.css'), 'utf-8');
      expect(styles).toContain("font-family: 'Inter'");

      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.name).toBe('test-docs-js');
      expect(packageJson.devDependencies).toHaveProperty('markdown-it-prism');
      expect(packageJson.scripts).toHaveProperty('build:drafts');
    });

    it('should convert the docs config to TypeScript and enable bundling', async () => {
      const projectDir = join(tempDir, 'test-docs-ts');
      const result = await createSite({
        projectName: 'test-docs-ts',
        template: 'docs',
        styling: 'css',
        typescript: true,
        gitInit: false,
        dir: projectDir,
      });

      await expect(access(join(result.targetDir, 'stati.config.js'))).rejects.toThrow();
      const config = await readFile(join(result.targetDir, 'stati.config.ts'), 'utf-8');
      expect(config).toContain("import { createDocs } from './helpers/docs.js';");
      expect(config).toMatch(/ {2}typescript: \{\n {4}enabled: true,\n {2}\},\n\}\);\n$/);
      await expect(access(join(result.targetDir, 'tsconfig.json'))).resolves.not.toThrow();
    });

    it('should keep the docs design when Tailwind is chosen', async () => {
      const projectDir = join(tempDir, 'test-docs-tailwind');
      const result = await createSite({
        projectName: 'test-docs-tailwind',
        template: 'docs',
        styling: 'tailwind',
        typescript: false,
        gitInit: false,
        dir: projectDir,
      });

      const css = await readFile(join(result.targetDir, 'src', 'styles.css'), 'utf-8');
      expect(css).toContain("@import 'tailwindcss';");
      expect(css).toContain('@layer components {\n');
      expect(css).toContain("font-family: 'Inter'");
      await expect(access(join(result.targetDir, 'public', 'styles.css'))).rejects.toThrow();
      await expect(
        access(join(result.targetDir, 'public', 'scripts', 'docs.js')),
      ).resolves.not.toThrow();
    });

    it('should keep the docs design when Sass is chosen', async () => {
      const projectDir = join(tempDir, 'test-docs-sass');
      const result = await createSite({
        projectName: 'test-docs-sass',
        template: 'docs',
        styling: 'sass',
        typescript: false,
        gitInit: false,
        dir: projectDir,
      });

      const scss = await readFile(join(result.targetDir, 'src', 'styles.scss'), 'utf-8');
      expect(scss).toContain("font-family: 'Inter'");
      expect(scss).toContain('--accent: #{$primary-color};');
      await expect(access(join(result.targetDir, 'public', 'styles.css'))).rejects.toThrow();
    });

    it('should add image tools after TypeScript bundling in a stati.config.ts', async () => {
      const projectDir = join(tempDir, 'test-docs-images');
      const result = await createSite({
        projectName: 'test-docs-images',
        template: 'docs',
        styling: 'css',
        typescript: true,
        images: true,
        gitInit: false,
        dir: projectDir,
      });

      const config = await readFile(join(result.targetDir, 'stati.config.ts'), 'utf-8');
      expect(config).toMatch(
        /typescript: \{\n {4}enabled: true,\n {2}\},\n\n[^]*images: \{\n {4}responsive: true,/,
      );
      expect(config).toContain(
        "{ name: 'Inter', path: './og/fonts/inter-semibold.woff', weight: 600 }",
      );
      expect(config).toContain(
        "{ name: 'Inter', path: './og/fonts/inter-extrabold.woff', weight: 800 }",
      );
      await expect(access(join(result.targetDir, 'site', 'og.eta'))).resolves.not.toThrow();
      await expect(
        access(join(result.targetDir, 'og', 'fonts', 'inter-extrabold.woff')),
      ).resolves.not.toThrow();
    });
  });

  describe('blank template with image tools', () => {
    it('should use the built-in card and set baseUrl', async () => {
      const projectDir = join(tempDir, 'test-blank-images');
      const result = await createSite({
        projectName: 'test-blank-images',
        template: 'blank',
        styling: 'css',
        typescript: false,
        images: true,
        gitInit: false,
        dir: projectDir,
      });

      const config = await readFile(join(result.targetDir, 'stati.config.js'), 'utf-8');
      expect(config).toContain("    baseUrl: 'https://example.com',");
      expect(config).toContain('  images: {\n    responsive: true,\n    og: true,\n  },\n});\n');
      await expect(access(join(result.targetDir, 'site', 'og.eta'))).rejects.toThrow();
      const packageJson = JSON.parse(
        await readFile(join(result.targetDir, 'package.json'), 'utf-8'),
      );
      expect(packageJson.devDependencies['@stati/images']).toBe('^1.0.0');
    });

    it('should set a placeholder baseUrl and leave images out without image tools', async () => {
      const projectDir = join(tempDir, 'test-blank-plain');
      const result = await createSite({
        projectName: 'test-blank-plain',
        template: 'blank',
        styling: 'css',
        typescript: true,
        gitInit: false,
        dir: projectDir,
      });

      const config = await readFile(join(result.targetDir, 'stati.config.ts'), 'utf-8');
      // SiteConfig requires baseUrl, so a TypeScript config without one does not type-check
      expect(config).toContain("    baseUrl: 'https://example.com',");
      expect(config).not.toContain('images:');
    });
  });

  describe('adaptTemplateConfig', () => {
    const config =
      "import { defineConfig } from '@stati/core';\n\nexport default defineConfig({\n  site: { title: 'Blog' },\n});\n";

    it('should keep a JavaScript config unchanged', () => {
      expect(adaptTemplateConfig(config, false)).toEqual({
        filename: 'stati.config.js',
        content: config,
      });
    });

    it('should enable TypeScript bundling in a stati.config.ts', () => {
      const result = adaptTemplateConfig(config, true);

      expect(result.filename).toBe('stati.config.ts');
      expect(result.content).toBe(
        "import { defineConfig } from '@stati/core';\n\nexport default defineConfig({\n  site: { title: 'Blog' },\n\n  typescript: {\n    enabled: true,\n  },\n});\n",
      );
    });

    it('should refuse a config it cannot adapt', () => {
      expect(() => adaptTemplateConfig('export default {};\n', true)).toThrow(
        'Template config must end',
      );
    });

    it('should add an images block to JavaScript and TypeScript configs', () => {
      const block = '  images: {\n    og: true,\n  }';

      expect(adaptTemplateConfig(config, false, block).content).toBe(
        "import { defineConfig } from '@stati/core';\n\nexport default defineConfig({\n  site: { title: 'Blog' },\n\n  images: {\n    og: true,\n  },\n});\n",
      );
      expect(adaptTemplateConfig(config, true, block).content).toBe(
        "import { defineConfig } from '@stati/core';\n\nexport default defineConfig({\n  site: { title: 'Blog' },\n\n  typescript: {\n    enabled: true,\n  },\n\n  images: {\n    og: true,\n  },\n});\n",
      );
    });
  });

  describe('ProjectScaffolder error handling', () => {
    it('should cleanup directory on error during scaffolding', async () => {
      const projectDir = join(tempDir, 'test-cleanup');
      const exampleManager = new ExampleManager();
      const scaffolder = new ProjectScaffolder(
        {
          projectName: 'test-cleanup',
          // @ts-expect-error - Testing invalid template to force error
          template: 'invalid-template',
          styling: 'css',
          gitInit: false,
        },
        exampleManager,
      );

      // Should fail and cleanup
      await expect(scaffolder.create(projectDir)).rejects.toThrow();

      // Directory should not exist after cleanup
      await expect(access(projectDir)).rejects.toThrow();
    });

    it('should handle cleanup failures gracefully', async () => {
      const projectDir = join(tempDir, 'test-cleanup-fail');
      const exampleManager = new ExampleManager();

      // Create a mock scaffolder with a forced error
      const scaffolder = new ProjectScaffolder(
        {
          projectName: 'test-cleanup-fail',
          template: 'blank',
          styling: 'css',
          gitInit: false,
        },
        exampleManager,
      );

      // Spy on console.warn to capture cleanup warnings
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Force an error by creating a file instead of allowing directory creation
      await mkdir(projectDir);
      await writeFile(join(projectDir, 'test.txt'), 'test');

      // Make directory read-only on non-Windows (Windows permissions are different)
      if (process.platform !== 'win32') {
        const { chmod } = await import('fs/promises');
        await chmod(projectDir, 0o444);
      }

      // This should fail during copyExample
      try {
        await scaffolder.create(join(projectDir, 'subdir'));
      } catch {
        // Expected to fail
      }

      consoleWarnSpy.mockRestore();

      // Cleanup test directory
      if (process.platform !== 'win32') {
        const { chmod } = await import('fs/promises');
        await chmod(projectDir, 0o755);
      }
    });

    it('should handle git initialization failure gracefully', async () => {
      const projectDir = join(tempDir, 'test-git-fail-' + Date.now());

      const options: CreateOptions = {
        projectName: 'test-git-fail',
        template: 'blank',
        styling: 'css',
        gitInit: true,
        dir: projectDir,
      };

      // Mock console.warn to capture git error messages
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create site with git init
      const result = await createSite(options);

      // After the project is created, manually create a .git file to simulate failure on next run
      // Since we can't easily force git init to fail in a real scenario,
      // we verify the warning mechanism by checking that git init was attempted
      expect(result.projectName).toBe('test-git-fail');
      await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();

      // If git is available, .git directory should exist; if not, warning should be logged
      const gitDirExists = await access(join(result.targetDir, '.git'))
        .then(() => true)
        .catch(() => false);

      if (!gitDirExists) {
        // Git init failed (git not available or other issue), warning should be logged
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to initialize git repository'),
        );
      }

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should use projectName as directory when dir option is not provided', async () => {
      const originalCwd = process.cwd();

      // Change to temp directory for this test
      process.chdir(tempDir);

      try {
        const options: CreateOptions = {
          projectName: 'test-no-dir-option',
          template: 'blank',
          styling: 'css',
          gitInit: false,
          // No dir option provided
        };

        const result = await createSite(options);

        expect(result.projectName).toBe('test-no-dir-option');
        // Should use projectName as the directory
        expect(result.targetDir).toContain('test-no-dir-option');

        await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();

        // Cleanup
        await rm(result.targetDir, { recursive: true, force: true });
      } finally {
        // Restore original directory
        process.chdir(originalCwd);
      }
    });
  });

  describe('detectAvailablePackageManagers', () => {
    it('should detect npm as it is always available in CI', async () => {
      const managers = await detectAvailablePackageManagers();
      expect(managers).toContain('npm');
    });
  });
});
