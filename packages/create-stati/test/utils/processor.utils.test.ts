import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  writeProcessorFiles,
  deleteProcessorFiles,
  applyProcessorResult,
} from '../../src/utils/processor.utils.js';
import { updatePackageJson } from '../../src/utils/package-json.utils.js';
import type { ProcessorResult, ProcessorResultWithDeletions } from '../../src/types.js';

vi.mock('node:fs/promises');
vi.mock('../../src/utils/package-json.utils.js');

// Use platform-specific paths for tests
const projectDir = join('/project');

describe('processor.utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('writeProcessorFiles', () => {
    it('should write files to the correct paths', async () => {
      const files = new Map([
        ['config.json', '{ "enabled": true }'],
        ['src/index.ts', 'console.log("Hello");'],
      ]);

      await writeProcessorFiles(projectDir, files);

      expect(mkdir).toHaveBeenCalledTimes(2);
      expect(writeFile).toHaveBeenCalledTimes(2);
      expect(writeFile).toHaveBeenCalledWith(
        join(projectDir, 'config.json'),
        '{ "enabled": true }',
      );
      expect(writeFile).toHaveBeenCalledWith(
        join(projectDir, 'src', 'index.ts'),
        'console.log("Hello");',
      );
    });

    it('should handle empty files map', async () => {
      const files = new Map<string, string>();

      await writeProcessorFiles(projectDir, files);

      expect(mkdir).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should handle deeply nested paths', async () => {
      const files = new Map([['a/b/c/d/file.txt', 'content']]);

      await writeProcessorFiles(projectDir, files);

      expect(mkdir).toHaveBeenCalledTimes(1);
      expect(writeFile).toHaveBeenCalledWith(
        join(projectDir, 'a', 'b', 'c', 'd', 'file.txt'),
        'content',
      );
    });
  });

  describe('deleteProcessorFiles', () => {
    it('should delete specified files', async () => {
      const filesToDelete = ['old-file.txt', 'deprecated/config.json'];

      await deleteProcessorFiles(projectDir, filesToDelete);

      expect(unlink).toHaveBeenCalledWith(join(projectDir, 'old-file.txt'));
      expect(unlink).toHaveBeenCalledWith(join(projectDir, 'deprecated', 'config.json'));
    });

    it('should handle empty array', async () => {
      await deleteProcessorFiles(projectDir, []);

      expect(unlink).not.toHaveBeenCalled();
    });

    it('should ignore errors when file does not exist', async () => {
      vi.mocked(unlink).mockRejectedValue(new Error('ENOENT'));

      // Should not throw
      await expect(deleteProcessorFiles(projectDir, ['missing.txt'])).resolves.not.toThrow();
    });
  });

  describe('applyProcessorResult', () => {
    it('should write files and update package.json', async () => {
      const result: ProcessorResult = {
        files: new Map([['file.txt', 'content']]),
        devDependencies: { typescript: '^5.0.0' },
        scripts: { build: 'tsc' },
      };

      await applyProcessorResult(projectDir, result);

      expect(writeFile).toHaveBeenCalledWith(join(projectDir, 'file.txt'), 'content');
      expect(updatePackageJson).toHaveBeenCalledWith(projectDir, {
        devDependencies: { typescript: '^5.0.0' },
        scripts: { build: 'tsc' },
      });
    });

    it('should handle result with file deletions', async () => {
      const result: ProcessorResultWithDeletions = {
        files: new Map([['new-file.scss', 'body {}']]),
        devDependencies: { sass: '^1.0.0' },
        scripts: {},
        filesToDelete: ['old-file.css'],
      };

      await applyProcessorResult(projectDir, result);

      expect(writeFile).toHaveBeenCalledWith(join(projectDir, 'new-file.scss'), 'body {}');
      expect(unlink).toHaveBeenCalledWith(join(projectDir, 'old-file.css'));
      expect(updatePackageJson).toHaveBeenCalled();
    });

    it('should not attempt deletions when filesToDelete is not present', async () => {
      const result: ProcessorResult = {
        files: new Map([['file.txt', 'content']]),
        devDependencies: {},
        scripts: {},
      };

      await applyProcessorResult(projectDir, result);

      expect(unlink).not.toHaveBeenCalled();
    });

    it('should handle empty result', async () => {
      const result: ProcessorResult = {
        files: new Map(),
        devDependencies: {},
        scripts: {},
      };

      await applyProcessorResult(projectDir, result);

      expect(writeFile).not.toHaveBeenCalled();
      expect(updatePackageJson).toHaveBeenCalledWith(projectDir, {
        devDependencies: {},
        scripts: {},
      });
    });
  });
});
