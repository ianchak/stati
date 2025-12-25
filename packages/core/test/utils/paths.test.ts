import { describe, it, expect } from 'vitest';
import {
  normalizePathForComparison,
  isPathWithinDirectory,
} from '../../src/core/utils/paths.utils.js';
import { join, resolve, sep } from 'node:path';

/**
 * Tests for path normalization utilities.
 * These tests verify cross-platform compatibility (Windows/Unix).
 */
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

      it('should normalize Windows drive letters to uppercase for consistent comparison', () => {
        // This test documents that drive letters are uppercased for comparison
        // WARNING: These normalized paths should ONLY be used for string comparison,
        // NEVER for actual file system operations (especially in WSL or case-sensitive environments)
        const pathWithLowercase = 'c:\\project\\site\\layout.eta';
        const pathWithUppercase = 'C:\\project\\site\\layout.eta';

        const normalizedLower = normalizePathForComparison(pathWithLowercase);
        const normalizedUpper = normalizePathForComparison(pathWithUppercase);

        // Drive letter should be uppercase for both
        expect(normalizedLower).toMatch(/^[A-Z]:\//);
        expect(normalizedUpper).toMatch(/^[A-Z]:\//);
        // They should match for comparison purposes
        expect(normalizedLower).toBe(normalizedUpper);

        // Verify the rest of the path is consistent
        expect(normalizedLower).toBe('C:/project/site/layout.eta');
        expect(normalizedUpper).toBe('C:/project/site/layout.eta');
      });
    });
  });

  describe('isPathWithinDirectory', () => {
    // Use resolved paths for cross-platform compatibility in tests
    const baseDir = resolve('/app/dist');

    describe('valid paths within directory', () => {
      it('should allow direct child files', () => {
        const targetPath = join(baseDir, 'index.html');
        expect(isPathWithinDirectory(baseDir, targetPath)).toBe(true);
      });

      it('should allow nested files in subdirectories', () => {
        const targetPath = join(baseDir, 'pages', 'about', 'index.html');
        expect(isPathWithinDirectory(baseDir, targetPath)).toBe(true);
      });

      it('should allow the base directory itself', () => {
        expect(isPathWithinDirectory(baseDir, baseDir)).toBe(true);
      });

      it('should handle relative paths that resolve within directory', () => {
        const targetPath = join(baseDir, 'pages', '..', 'index.html');
        expect(isPathWithinDirectory(baseDir, targetPath)).toBe(true);
      });
    });

    describe('path traversal attempts (must be rejected)', () => {
      it('should reject simple path traversal with ../', () => {
        const targetPath = join(baseDir, '..', 'etc', 'passwd');
        expect(isPathWithinDirectory(baseDir, targetPath)).toBe(false);
      });

      it('should reject multiple path traversal sequences', () => {
        const targetPath = join(baseDir, '..', '..', '..', 'etc', 'passwd');
        expect(isPathWithinDirectory(baseDir, targetPath)).toBe(false);
      });

      it('should reject path that starts outside and goes back in', () => {
        // This path goes outside and then tries to come back to a different directory
        const targetPath = join(baseDir, '..', 'other-project', 'data.txt');
        expect(isPathWithinDirectory(baseDir, targetPath)).toBe(false);
      });

      it('should reject absolute paths outside the base directory', () => {
        const etcPath = resolve('/etc/passwd');
        expect(isPathWithinDirectory(baseDir, etcPath)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject paths that are prefix matches but not within directory', () => {
        // /app/dist-other is not within /app/dist
        const similarPath = resolve('/app/dist-other/file.txt');
        expect(isPathWithinDirectory(baseDir, similarPath)).toBe(false);
      });

      it('should handle trailing slashes in base directory', () => {
        const baseDirWithSlash = baseDir + sep;
        const targetPath = join(baseDir, 'index.html');
        expect(isPathWithinDirectory(baseDirWithSlash, targetPath)).toBe(true);
      });

      it('should handle Windows-style paths on Windows', () => {
        // This test uses platform-agnostic approach
        const windowsLikeBase = resolve('C:', 'app', 'dist');
        const windowsLikeTarget = resolve('C:', 'app', 'dist', 'index.html');
        expect(isPathWithinDirectory(windowsLikeBase, windowsLikeTarget)).toBe(true);
      });

      it('should reject Windows-style path traversal', () => {
        const windowsLikeBase = resolve('C:', 'app', 'dist');
        const traversalTarget = resolve('C:', 'app', 'dist', '..', '..', 'etc', 'passwd');
        expect(isPathWithinDirectory(windowsLikeBase, traversalTarget)).toBe(false);
      });
    });

    describe('server request path simulation', () => {
      it('should protect against HTTP path traversal attack', () => {
        // Simulate how dev/preview servers construct paths
        const outDir = resolve('/project/dist');
        const maliciousRequestPath = '/../../../etc/passwd';

        // This is how the server constructs the file path
        const originalFilePath = join(outDir, maliciousRequestPath);

        // The security check should catch this
        expect(isPathWithinDirectory(outDir, originalFilePath)).toBe(false);
      });

      it('should allow normal HTTP request paths', () => {
        const outDir = resolve('/project/dist');

        // Test various normal request paths
        const normalPaths = [
          '/',
          '/index.html',
          '/about',
          '/blog/post-1',
          '/assets/styles.css',
          '/images/logo.png',
        ];

        for (const requestPath of normalPaths) {
          const originalFilePath = join(outDir, requestPath === '/' ? 'index.html' : requestPath);
          expect(isPathWithinDirectory(outDir, originalFilePath)).toBe(true);
        }
      });
    });
  });
});
