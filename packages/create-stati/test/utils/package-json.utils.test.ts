import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import {
  readPackageJson,
  writePackageJson,
  updatePackageJson,
  updatePackageScripts,
  updatePackageDeps,
} from '../../src/utils/package-json.utils.js';
import type { PackageJson } from '../../src/utils/package-json.utils.js';

describe('package-json.utils', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-pkg-utils-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('readPackageJson', () => {
    it('should read and parse package.json', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: '1.0.0',
        scripts: {
          test: 'vitest',
        },
        dependencies: {
          react: '^18.0.0',
        },
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(pkg, null, 2));

      const result = await readPackageJson(tempDir);

      expect(result).toEqual(pkg);
    });

    it('should throw error if package.json does not exist', async () => {
      await expect(readPackageJson(tempDir)).rejects.toThrow();
    });

    it('should throw error if package.json is invalid JSON', async () => {
      await writeFile(join(tempDir, 'package.json'), 'invalid json {');

      await expect(readPackageJson(tempDir)).rejects.toThrow();
    });

    it('should handle package.json with custom fields', async () => {
      const pkg = {
        name: 'test',
        version: '1.0.0',
        stati: {
          engine: 'stati',
          version: '1.0.0',
        },
        custom: {
          field: 'value',
        },
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(pkg, null, 2));

      const result = await readPackageJson(tempDir);

      expect(result).toEqual(pkg);
      expect(result.stati).toEqual({ engine: 'stati', version: '1.0.0' });
      expect(result.custom).toEqual({ field: 'value' });
    });
  });

  describe('writePackageJson', () => {
    it('should write package.json with proper formatting', async () => {
      const pkg: PackageJson = {
        name: 'test-package',
        version: '1.0.0',
        scripts: {
          build: 'tsc',
        },
      };

      await writePackageJson(tempDir, pkg);

      const content = await readFile(join(tempDir, 'package.json'), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(pkg);
      expect(content).toContain('  "name": "test-package"');
      expect(content).toContain('  "version": "1.0.0"');
      expect(content.endsWith('\n')).toBe(true);
    });

    it('should handle empty package.json', async () => {
      const pkg: PackageJson = {};

      await writePackageJson(tempDir, pkg);

      const content = await readFile(join(tempDir, 'package.json'), 'utf-8');
      expect(content).toBe('{}\n');
    });

    it('should preserve custom fields', async () => {
      const pkg = {
        name: 'test',
        custom: {
          nested: {
            value: 123,
          },
        },
      };

      await writePackageJson(tempDir, pkg);

      const content = await readFile(join(tempDir, 'package.json'), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.custom).toEqual({ nested: { value: 123 } });
    });
  });

  describe('updatePackageJson', () => {
    beforeEach(async () => {
      const initialPkg: PackageJson = {
        name: 'initial-package',
        version: '1.0.0',
        scripts: {
          test: 'vitest',
        },
        dependencies: {
          react: '^18.0.0',
        },
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(initialPkg, null, 2));
    });

    it('should update package.json name', async () => {
      await updatePackageJson(tempDir, { name: 'updated-package' });

      const result = await readPackageJson(tempDir);
      expect(result.name).toBe('updated-package');
      expect(result.version).toBe('1.0.0');
    });

    it('should merge scripts', async () => {
      await updatePackageJson(tempDir, {
        scripts: {
          build: 'tsc',
          dev: 'vite',
        },
      });

      const result = await readPackageJson(tempDir);
      expect(result.scripts).toEqual({
        test: 'vitest',
        build: 'tsc',
        dev: 'vite',
      });
    });

    it('should merge dependencies', async () => {
      await updatePackageJson(tempDir, {
        dependencies: {
          vue: '^3.0.0',
        },
      });

      const result = await readPackageJson(tempDir);
      expect(result.dependencies).toEqual({
        react: '^18.0.0',
        vue: '^3.0.0',
      });
    });

    it('should merge devDependencies', async () => {
      await updatePackageJson(tempDir, {
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
        },
      });

      const result = await readPackageJson(tempDir);
      expect(result.devDependencies).toEqual({
        typescript: '^5.0.0',
        vitest: '^1.0.0',
      });
    });

    it('should handle multiple updates at once', async () => {
      await updatePackageJson(tempDir, {
        name: 'multi-update',
        version: '2.0.0',
        scripts: {
          build: 'tsc',
        },
        dependencies: {
          vue: '^3.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
      });

      const result = await readPackageJson(tempDir);
      expect(result.name).toBe('multi-update');
      expect(result.version).toBe('2.0.0');
      expect(result.scripts).toEqual({
        test: 'vitest',
        build: 'tsc',
      });
      expect(result.dependencies).toEqual({
        react: '^18.0.0',
        vue: '^3.0.0',
      });
      expect(result.devDependencies).toEqual({
        typescript: '^5.0.0',
      });
    });

    it('should preserve existing dependencies when merging', async () => {
      await updatePackageJson(tempDir, {
        dependencies: {
          react: '^19.0.0', // Update existing
          axios: '^1.0.0', // Add new
        },
      });

      const result = await readPackageJson(tempDir);
      expect(result.dependencies).toEqual({
        react: '^19.0.0',
        axios: '^1.0.0',
      });
    });
  });

  describe('updatePackageScripts', () => {
    beforeEach(async () => {
      const initialPkg: PackageJson = {
        name: 'test-package',
        version: '1.0.0',
        scripts: {
          test: 'vitest',
        },
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(initialPkg, null, 2));
    });

    it('should update scripts', async () => {
      await updatePackageScripts(tempDir, {
        build: 'tsc',
        dev: 'vite',
      });

      const result = await readPackageJson(tempDir);
      expect(result.scripts).toEqual({
        test: 'vitest',
        build: 'tsc',
        dev: 'vite',
      });
    });

    it('should replace existing scripts', async () => {
      await updatePackageScripts(tempDir, {
        test: 'jest',
      });

      const result = await readPackageJson(tempDir);
      expect(result.scripts).toEqual({
        test: 'jest',
      });
    });

    it('should handle empty scripts', async () => {
      await updatePackageScripts(tempDir, {});

      const result = await readPackageJson(tempDir);
      expect(result.scripts).toEqual({
        test: 'vitest',
      });
    });
  });

  describe('updatePackageDeps', () => {
    beforeEach(async () => {
      const initialPkg: PackageJson = {
        name: 'test-package',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
        },
        devDependencies: {
          vitest: '^1.0.0',
        },
      };

      await writeFile(join(tempDir, 'package.json'), JSON.stringify(initialPkg, null, 2));
    });

    it('should update dependencies only', async () => {
      await updatePackageDeps(tempDir, { vue: '^3.0.0' });

      const result = await readPackageJson(tempDir);
      expect(result.dependencies).toEqual({
        react: '^18.0.0',
        vue: '^3.0.0',
      });
      expect(result.devDependencies).toEqual({
        vitest: '^1.0.0',
      });
    });

    it('should update devDependencies only', async () => {
      await updatePackageDeps(tempDir, undefined, { typescript: '^5.0.0' });

      const result = await readPackageJson(tempDir);
      expect(result.dependencies).toEqual({
        react: '^18.0.0',
      });
      expect(result.devDependencies).toEqual({
        vitest: '^1.0.0',
        typescript: '^5.0.0',
      });
    });

    it('should update both dependencies and devDependencies', async () => {
      await updatePackageDeps(tempDir, { axios: '^1.0.0' }, { eslint: '^8.0.0' });

      const result = await readPackageJson(tempDir);
      expect(result.dependencies).toEqual({
        react: '^18.0.0',
        axios: '^1.0.0',
      });
      expect(result.devDependencies).toEqual({
        vitest: '^1.0.0',
        eslint: '^8.0.0',
      });
    });

    it('should handle undefined dependencies', async () => {
      await updatePackageDeps(tempDir);

      const result = await readPackageJson(tempDir);
      expect(result.dependencies).toEqual({
        react: '^18.0.0',
      });
      expect(result.devDependencies).toEqual({
        vitest: '^1.0.0',
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when reading non-existent directory', async () => {
      const nonExistentDir = join(tempDir, 'does-not-exist');
      await expect(readPackageJson(nonExistentDir)).rejects.toThrow();
    });

    it('should throw error when writing to non-existent directory without creating it', async () => {
      const nonExistentDir = join(tempDir, 'does-not-exist');
      const pkg: PackageJson = { name: 'test' };

      await expect(writePackageJson(nonExistentDir, pkg)).rejects.toThrow();
    });

    it('should succeed when writing to existing directory', async () => {
      const subDir = join(tempDir, 'sub-dir');
      await mkdir(subDir);

      const pkg: PackageJson = { name: 'test' };
      await expect(writePackageJson(subDir, pkg)).resolves.not.toThrow();
    });
  });
});
