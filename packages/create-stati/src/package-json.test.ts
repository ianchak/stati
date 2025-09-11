import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { PackageJsonModifier } from './package-json.js';

describe('PackageJsonModifier', () => {
  let tempDir: string;
  let packageModifier: PackageJsonModifier;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-package-test-'));
    packageModifier = new PackageJsonModifier({ projectName: 'test-project' });
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('modifyPackageJson', () => {
    it('should modify project name in existing package.json', async () => {
      const originalPackageJson = {
        name: 'blank-template',
        version: '1.0.0',
        scripts: {
          dev: 'stati dev',
          build: 'stati build',
        },
        devDependencies: {
          '@stati/cli': '^1.0.0',
          '@stati/core': '^1.0.0',
        },
      };

      const packageJsonPath = join(tempDir, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify(originalPackageJson, null, 2));

      await packageModifier.modifyPackageJson(tempDir);

      const modifiedContent = await readFile(packageJsonPath, 'utf-8');
      const modifiedPackageJson = JSON.parse(modifiedContent);

      expect(modifiedPackageJson.name).toBe('test-project');
      expect(modifiedPackageJson.version).toBe('1.0.0');
      expect(modifiedPackageJson.scripts).toEqual(originalPackageJson.scripts);
      expect(modifiedPackageJson.devDependencies).toEqual(originalPackageJson.devDependencies);
    });

    it('should preserve formatting with proper indentation', async () => {
      const originalPackageJson = {
        name: 'old-name',
        version: '1.0.0',
      };

      const packageJsonPath = join(tempDir, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify(originalPackageJson, null, 2));

      await packageModifier.modifyPackageJson(tempDir);

      const modifiedContent = await readFile(packageJsonPath, 'utf-8');

      // Should have proper 2-space indentation and trailing newline
      expect(modifiedContent).toContain('  "name": "test-project"');
      expect(modifiedContent).toContain('  "version": "1.0.0"');
      expect(modifiedContent.endsWith('\n')).toBe(true);
    });

    it('should handle empty project name', async () => {
      const emptyNameModifier = new PackageJsonModifier({ projectName: '' });
      const originalPackageJson = {
        name: 'old-name',
        version: '1.0.0',
      };

      const packageJsonPath = join(tempDir, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify(originalPackageJson, null, 2));

      await emptyNameModifier.modifyPackageJson(tempDir);

      const modifiedContent = await readFile(packageJsonPath, 'utf-8');
      const modifiedPackageJson = JSON.parse(modifiedContent);

      expect(modifiedPackageJson.name).toBe('');
    });

    it('should handle special characters in project name', async () => {
      const specialNameModifier = new PackageJsonModifier({
        projectName: 'my-awesome-site_v2.0',
      });

      const originalPackageJson = {
        name: 'old-name',
        version: '1.0.0',
      };

      const packageJsonPath = join(tempDir, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify(originalPackageJson, null, 2));

      await specialNameModifier.modifyPackageJson(tempDir);

      const modifiedContent = await readFile(packageJsonPath, 'utf-8');
      const modifiedPackageJson = JSON.parse(modifiedContent);

      expect(modifiedPackageJson.name).toBe('my-awesome-site_v2.0');
    });

    it('should preserve all other fields unchanged', async () => {
      const complexPackageJson = {
        name: 'old-name',
        version: '2.1.0',
        description: 'A test package',
        main: 'index.js',
        keywords: ['test', 'static-site'],
        author: 'Test Author',
        license: 'MIT',
        scripts: {
          dev: 'stati dev',
          build: 'stati build',
          test: 'vitest',
          'type-check': 'tsc --noEmit',
        },
        dependencies: {
          'some-dependency': '^1.0.0',
        },
        devDependencies: {
          '@stati/cli': '^1.0.0',
          '@stati/core': '^1.0.0',
          typescript: '^5.0.0',
        },
        repository: {
          type: 'git',
          url: 'https://github.com/test/repo.git',
        },
        bugs: 'https://github.com/test/repo/issues',
        homepage: 'https://github.com/test/repo#readme',
      };

      const packageJsonPath = join(tempDir, 'package.json');
      await writeFile(packageJsonPath, JSON.stringify(complexPackageJson, null, 2));

      await packageModifier.modifyPackageJson(tempDir);

      const modifiedContent = await readFile(packageJsonPath, 'utf-8');
      const modifiedPackageJson = JSON.parse(modifiedContent);

      // Only name should change
      expect(modifiedPackageJson.name).toBe('test-project');

      // Everything else should remain the same
      expect(modifiedPackageJson.version).toBe(complexPackageJson.version);
      expect(modifiedPackageJson.description).toBe(complexPackageJson.description);
      expect(modifiedPackageJson.main).toBe(complexPackageJson.main);
      expect(modifiedPackageJson.keywords).toEqual(complexPackageJson.keywords);
      expect(modifiedPackageJson.author).toBe(complexPackageJson.author);
      expect(modifiedPackageJson.license).toBe(complexPackageJson.license);
      expect(modifiedPackageJson.scripts).toEqual(complexPackageJson.scripts);
      expect(modifiedPackageJson.dependencies).toEqual(complexPackageJson.dependencies);
      expect(modifiedPackageJson.devDependencies).toEqual(complexPackageJson.devDependencies);
      expect(modifiedPackageJson.repository).toEqual(complexPackageJson.repository);
      expect(modifiedPackageJson.bugs).toBe(complexPackageJson.bugs);
      expect(modifiedPackageJson.homepage).toBe(complexPackageJson.homepage);
    });

    it('should throw error when package.json does not exist', async () => {
      await expect(packageModifier.modifyPackageJson(tempDir)).rejects.toThrow(
        'Failed to modify package.json',
      );
    });

    it('should throw error when package.json is malformed', async () => {
      const packageJsonPath = join(tempDir, 'package.json');
      await writeFile(packageJsonPath, '{ invalid json content');

      await expect(packageModifier.modifyPackageJson(tempDir)).rejects.toThrow(
        'Failed to modify package.json',
      );
    });

    it('should handle write errors gracefully', async () => {
      // Test with a non-existent directory to demonstrate error handling
      const nonExistentDir = join(tempDir, 'does-not-exist');

      await expect(packageModifier.modifyPackageJson(nonExistentDir)).rejects.toThrow(
        'Failed to modify package.json',
      );
    });
  });
});
