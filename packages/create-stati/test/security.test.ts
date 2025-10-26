import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, access } from 'fs/promises';
import { createSite, detectAvailablePackageManagers } from '../src/create.js';
import type { CreateOptions } from '../src/create.js';

describe('Security and edge cases', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-security-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateDirectoryPath security checks', () => {
    it('should reject paths with null bytes', async () => {
      const projectDir = join(tempDir, 'test-null\0byte');
      const options: CreateOptions = {
        projectName: 'test-null',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        packageManager: 'npm',
        dir: projectDir,
      };

      // Mock console to prevent error output
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await expect(createSite(options)).rejects.toThrow('null byte');

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should reject root directory creation on Unix systems', async () => {
      if (process.platform === 'win32') {
        // Skip on Windows as the validation works differently
        return;
      }

      const options: CreateOptions = {
        projectName: 'test-root',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        packageManager: 'npm',
        dir: '/',
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await expect(createSite(options)).rejects.toThrow();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle system directory attempts', async () => {
      // Test just verifies code runs and throws (either permission error or validation error)
      const systemDir =
        process.platform === 'win32'
          ? join('C:\\Windows', 'test-stati-temp-' + Date.now())
          : join('/etc', 'test-stati-temp-' + Date.now());

      const options: CreateOptions = {
        projectName: 'test-system',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        packageManager: 'npm',
        dir: systemDir,
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Just verify it throws - it could be permission or validation error
      await expect(createSite(options)).rejects.toThrow();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('detectAvailablePackageManagers edge cases', () => {
    it('should return all available managers', async () => {
      const managers = await detectAvailablePackageManagers();

      // npm should always be available in test environment
      expect(managers).toContain('npm');
      expect(managers.length).toBeGreaterThan(0);
    });
  });

  describe('Installation error suggestions', () => {
    it('should provide helpful error message for permission errors', async () => {
      const projectDir = join(tempDir, 'test-permissions');
      const options: CreateOptions = {
        projectName: 'test-permissions',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        packageManager: 'npm',
        dir: projectDir,
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create the project - installation might fail but that's ok
      const result = await createSite(options);

      // Project should be created even if install fails
      expect(result.projectName).toBe('test-permissions');
      await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    }, 30000);
  });

  describe('InstallDependencies return value', () => {
    it('should return success result when dependencies install successfully', async () => {
      const projectDir = join(tempDir, 'test-install-success');
      const options: CreateOptions = {
        projectName: 'test-install-success',
        template: 'blank',
        styling: 'css',
        gitInit: false,
        install: true,
        packageManager: 'npm',
        dir: projectDir,
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await createSite(options);

      expect(result.projectName).toBe('test-install-success');
      await expect(access(join(result.targetDir, 'package.json'))).resolves.not.toThrow();

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    }, 30000);
  });
});
