import { describe, it, expect } from 'vitest';
import type { ProcessorResult, ProcessorResultWithDeletions } from '../src/types.js';

describe('types', () => {
  describe('ProcessorResult', () => {
    it('should accept a valid ProcessorResult object', () => {
      const result: ProcessorResult = {
        files: new Map([['test.txt', 'content']]),
        devDependencies: { typescript: '^5.6.0' },
        scripts: { build: 'tsc' },
      };

      expect(result.files).toBeInstanceOf(Map);
      expect(result.files.get('test.txt')).toBe('content');
      expect(result.devDependencies.typescript).toBe('^5.6.0');
      expect(result.scripts.build).toBe('tsc');
    });

    it('should accept empty collections', () => {
      const result: ProcessorResult = {
        files: new Map(),
        devDependencies: {},
        scripts: {},
      };

      expect(result.files.size).toBe(0);
      expect(Object.keys(result.devDependencies)).toHaveLength(0);
      expect(Object.keys(result.scripts)).toHaveLength(0);
    });

    it('should accept multiple files', () => {
      const result: ProcessorResult = {
        files: new Map([
          ['config.json', '{}'],
          ['src/index.ts', 'export {};'],
          ['src/utils/helper.ts', 'export const helper = () => {};'],
        ]),
        devDependencies: {},
        scripts: {},
      };

      expect(result.files.size).toBe(3);
    });
  });

  describe('ProcessorResultWithDeletions', () => {
    it('should extend ProcessorResult with filesToDelete', () => {
      const result: ProcessorResultWithDeletions = {
        files: new Map([['new-file.txt', 'content']]),
        devDependencies: {},
        scripts: {},
        filesToDelete: ['old-file.txt'],
      };

      expect(result.filesToDelete).toContain('old-file.txt');
    });

    it('should allow filesToDelete to be omitted', () => {
      const result: ProcessorResultWithDeletions = {
        files: new Map(),
        devDependencies: {},
        scripts: {},
      };

      expect(result.filesToDelete).toBeUndefined();
    });

    it('should allow multiple files to delete', () => {
      const result: ProcessorResultWithDeletions = {
        files: new Map(),
        devDependencies: {},
        scripts: {},
        filesToDelete: ['file1.txt', 'file2.txt', 'dir/file3.txt'],
      };

      expect(result.filesToDelete).toHaveLength(3);
    });

    it('should be assignable to ProcessorResult when filesToDelete is checked', () => {
      const withDeletions: ProcessorResultWithDeletions = {
        files: new Map([['test.txt', 'content']]),
        devDependencies: { dep: '^1.0.0' },
        scripts: { test: 'echo test' },
        filesToDelete: ['old.txt'],
      };

      // This should work because ProcessorResultWithDeletions extends ProcessorResult
      const asBase: ProcessorResult = withDeletions;
      expect(asBase.files.get('test.txt')).toBe('content');

      // We can check for filesToDelete using type guard
      if ('filesToDelete' in withDeletions && withDeletions.filesToDelete) {
        expect(withDeletions.filesToDelete).toContain('old.txt');
      }
    });
  });
});
