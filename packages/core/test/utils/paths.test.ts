import { describe, it, expect } from 'vitest';
import { normalizePathForComparison } from '../../src/core/utils/paths.utils.js';
import { join } from 'node:path';

describe('Path Normalization Utilities', () => {
  describe('normalizePathForComparison', () => {
    it('should normalize Windows paths to POSIX format', () => {
      const windowsPath = 'C:\\project\\site\\layout.eta';
      const normalized = normalizePathForComparison(windowsPath);

      // Should convert backslashes to forward slashes
      expect(normalized).not.toContain('\\');
      expect(normalized).toContain('/');
      expect(normalized).toContain('layout.eta');
    });

    it('should handle already normalized POSIX paths', () => {
      const posixPath = '/project/site/layout.eta';
      const normalized = normalizePathForComparison(posixPath);

      expect(normalized).toBe(posixPath);
    });

    it('should resolve relative paths to absolute with provided base', () => {
      const relativePath = 'site/layout.eta';
      const basePath = '/project';
      const normalized = normalizePathForComparison(relativePath, basePath);

      expect(normalized).toBe('/project/site/layout.eta');
    });

    it('should resolve relative paths using cwd when no base provided', () => {
      const relativePath = 'site/layout.eta';
      const normalized = normalizePathForComparison(relativePath);

      // Should be absolute - check for either Unix-style (/) or Windows-style (C:/) paths
      expect(normalized).toMatch(/^(\/|[a-zA-Z]:\/)/);
      expect(normalized).toContain('site/layout.eta');
    });

    it('should handle paths with .. segments', () => {
      const pathWithDots = '/project/site/../templates/layout.eta';
      const normalized = normalizePathForComparison(pathWithDots);

      expect(normalized).toBe('/project/templates/layout.eta');
      expect(normalized).not.toContain('..');
    });

    it('should handle paths with . segments', () => {
      const pathWithDots = '/project/./site/layout.eta';
      const normalized = normalizePathForComparison(pathWithDots);

      expect(normalized).toBe('/project/site/layout.eta');
      expect(normalized).not.toContain('/./');
    });

    it('should remove trailing slashes except for root', () => {
      const pathWithSlash = '/project/site/';
      const normalized = normalizePathForComparison(pathWithSlash);

      expect(normalized).toBe('/project/site');
      expect(normalized).not.toMatch(/\/$/);
    });

    it('should preserve root path as single slash', () => {
      const rootPath = '/';
      const normalized = normalizePathForComparison(rootPath);

      expect(normalized).toBe('/');
    });

    it('should handle multiple consecutive slashes', () => {
      const pathWithMultipleSlashes = '/project//site///layout.eta';
      const normalized = normalizePathForComparison(pathWithMultipleSlashes);

      expect(normalized).toBe('/project/site/layout.eta');
      expect(normalized).not.toMatch(/\/\//);
    });

    it('should normalize paths consistently for comparison', () => {
      // Different representations of the same path
      const path1 = '/project/site/layout.eta';
      const path2 = '/project/./site/layout.eta';
      const path3 = '/project/site/../site/layout.eta';

      const norm1 = normalizePathForComparison(path1);
      const norm2 = normalizePathForComparison(path2);
      const norm3 = normalizePathForComparison(path3);

      expect(norm1).toBe(norm2);
      expect(norm2).toBe(norm3);
    });

    it('should handle mixed path separators', () => {
      const mixedPath = 'C:\\project/site\\layout.eta';
      const normalized = normalizePathForComparison(mixedPath);

      expect(normalized).not.toContain('\\');
      expect(normalized).toContain('/');
      expect(normalized).toContain('layout.eta');
    });

    it('should be case-preserving', () => {
      const path = '/Project/Site/Layout.eta';
      const normalized = normalizePathForComparison(path);

      // Should preserve original case
      expect(normalized).toBe('/Project/Site/Layout.eta');
    });

    it('should handle empty relative paths', () => {
      const emptyPath = '.';
      const basePath = '/project';
      const normalized = normalizePathForComparison(emptyPath, basePath);

      expect(normalized).toBe('/project');
    });

    it('should handle parent directory references correctly', () => {
      const path = '../templates/layout.eta';
      const basePath = '/project/site';
      const normalized = normalizePathForComparison(path, basePath);

      expect(normalized).toBe('/project/templates/layout.eta');
    });

    describe('template change detection use case', () => {
      it('should match paths from different sources (watcher vs cache)', () => {
        const cwd = process.cwd();

        // Simulate path from cache (absolute)
        const cachedPath = join(cwd, 'site', '_partials', 'header.eta');

        // Simulate path from file watcher (might be relative or formatted differently)
        const watcherPath = join('site', '_partials', 'header.eta');

        const normalizedCached = normalizePathForComparison(cachedPath);
        const normalizedWatcher = normalizePathForComparison(watcherPath, cwd);

        expect(normalizedCached).toBe(normalizedWatcher);
      });

      it('should match Windows watcher paths with POSIX cached paths', () => {
        const cachedPath = '/project/site/_partials/header.eta';
        const watcherPath = 'C:\\project\\site\\_partials\\header.eta';

        const normalizedCached = normalizePathForComparison(cachedPath);
        const normalizedWatcher = normalizePathForComparison(watcherPath);

        // Both should be in same format (forward slashes)
        expect(normalizedCached).toContain('_partials/header.eta');
        expect(normalizedWatcher).toContain('_partials/header.eta');
        expect(normalizedWatcher).not.toContain('\\');
      });
    });
  });
});
