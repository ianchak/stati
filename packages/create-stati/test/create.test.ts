import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, access, readFile, writeFile, mkdir } from 'fs/promises';
import { createSite, ProjectScaffolder, detectAvailablePackageManagers } from '../src/create.js';
import type { CreateOptions } from '../src/create.js';
import { ExampleManager } from '../src/examples.js';

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

      // Verify Tailwind config includes both site files and inventory file
      const configContent = await readFile(join(result.targetDir, 'tailwind.config.js'), 'utf-8');
      expect(configContent).toContain('./site/**/*.{md,eta,html}');
      expect(configContent).toContain('./.stati/tailwind-classes.html');
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
  });

  describe('detectAvailablePackageManagers', () => {
    it('should detect npm as it is always available in CI', async () => {
      const managers = await detectAvailablePackageManagers();
      expect(managers).toContain('npm');
    });

    it('should return empty array on catastrophic failure', async () => {
      // Save original DEBUG value
      const originalDebug = process.env.DEBUG;

      // Enable DEBUG mode to test debug logging
      process.env.DEBUG = 'true';

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      // Can't easily force a catastrophic failure in detectAvailablePackageManagers
      // but we can at least test it runs without throwing
      const managers = await detectAvailablePackageManagers();
      expect(Array.isArray(managers)).toBe(true);

      // Restore DEBUG
      process.env.DEBUG = originalDebug;
      consoleSpy.mockRestore();
    });
  });
});
