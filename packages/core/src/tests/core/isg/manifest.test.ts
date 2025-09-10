import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'path';
import type { CacheManifest } from '../../../types.js';

// Mock fs-extra completely inside the factory to avoid hoisting issues
vi.mock('fs-extra', () => {
  const createMockFunction = () => vi.fn();

  return {
    default: {
      readFile: createMockFunction(),
      writeFile: createMockFunction(),
      pathExists: createMockFunction(),
      ensureDir: createMockFunction(),
    },
  };
});

// Import the module under test
import {
  createEmptyManifest,
  loadCacheManifest,
  saveCacheManifest,
} from '../../../core/isg/manifest.js';

describe('ISG Cache Manifest', () => {
  const testCacheDir = join('test', 'cache');
  const manifestPath = join(testCacheDir, 'manifest.json');

  // Get references to the mocked functions
  let mockReadFile: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;
  let mockPathExists: ReturnType<typeof vi.fn>;
  let mockEnsureDir: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Get the mocked fs-extra module
    const fsExtra = await import('fs-extra');
    const mockedFsExtra = vi.mocked(fsExtra.default);

    mockReadFile = mockedFsExtra.readFile;
    mockWriteFile = mockedFsExtra.writeFile;
    mockPathExists = mockedFsExtra.pathExists;
    mockEnsureDir = mockedFsExtra.ensureDir;

    vi.clearAllMocks();
  });

  describe('createEmptyManifest', () => {
    it('should create empty manifest with correct structure', () => {
      const manifest = createEmptyManifest();

      expect(manifest).toEqual({
        entries: {},
      });
      expect(Object.keys(manifest.entries)).toHaveLength(0);
    });
  });

  describe('loadCacheManifest', () => {
    it('should return null when file does not exist', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toBeNull();
      expect(mockPathExists).toHaveBeenCalledWith(manifestPath);
    });

    it('should load existing manifest', async () => {
      const mockManifest: CacheManifest = {
        entries: {
          '/page1': {
            path: 'page1.html',
            inputsHash: 'abc123',
            deps: ['layout.eta'],
            tags: ['page'],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      };

      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockManifest));

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toEqual(mockManifest);
      expect(mockPathExists).toHaveBeenCalledWith(manifestPath);
      expect(mockReadFile).toHaveBeenCalledWith(manifestPath, 'utf-8');
    });

    it('should return null on read error', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('Read error'));

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toBeNull();
    });

    it('should return null on invalid JSON', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('invalid json');

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toBeNull();
    });

    it('should handle manifest with multiple entries', async () => {
      const mockManifest: CacheManifest = {
        entries: {
          '/page1': {
            path: 'page1.html',
            inputsHash: 'abc123',
            deps: ['layout.eta'],
            tags: ['page'],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
          '/page2': {
            path: 'page2.html',
            inputsHash: 'def456',
            deps: ['layout.eta', 'style.css'],
            tags: ['page', 'styled'],
            publishedAt: new Date(Date.now() - 86400000).toISOString(),
            renderedAt: new Date().toISOString(),
            ttlSeconds: 7200,
            maxAgeCapDays: 30,
          },
        },
      };

      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockManifest));

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toEqual(mockManifest);
      expect(Object.keys(result!.entries)).toHaveLength(2);
    });
  });

  describe('saveCacheManifest', () => {
    const mockManifest: CacheManifest = {
      entries: {
        '/page1': {
          path: 'page1.html',
          inputsHash: 'abc123',
          deps: ['layout.eta'],
          tags: ['page'],
          renderedAt: new Date().toISOString(),
          ttlSeconds: 3600,
        },
      },
    };

    it('should save manifest successfully', async () => {
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await saveCacheManifest(testCacheDir, mockManifest);

      expect(mockEnsureDir).toHaveBeenCalledWith(testCacheDir);
      expect(mockWriteFile).toHaveBeenCalledWith(
        manifestPath,
        JSON.stringify(mockManifest, null, 2),
        'utf-8',
      );
    });

    it('should handle ensureDir error', async () => {
      mockEnsureDir.mockRejectedValue(new Error('Directory error'));

      await expect(saveCacheManifest(testCacheDir, mockManifest)).rejects.toThrow(
        'Failed to save cache manifest to',
      );
    });

    it('should handle writeFile error', async () => {
      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(new Error('Write error'));

      await expect(saveCacheManifest(testCacheDir, mockManifest)).rejects.toThrow(
        'Failed to save cache manifest to',
      );
    });

    it('should save empty manifest', async () => {
      const emptyManifest = createEmptyManifest();

      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await saveCacheManifest(testCacheDir, emptyManifest);

      expect(mockWriteFile).toHaveBeenCalledWith(
        manifestPath,
        JSON.stringify(emptyManifest, null, 2),
        'utf-8',
      );
    });

    it('should handle filesystem permission errors', async () => {
      const permissionError = new Error('Permission denied') as Error & { code: string };
      permissionError.code = 'EACCES';

      mockEnsureDir.mockRejectedValue(permissionError);

      await expect(saveCacheManifest(testCacheDir, mockManifest)).rejects.toThrow(
        'Permission denied saving cache manifest',
      );
    });

    it('should handle disk full errors', async () => {
      const diskFullError = new Error('No space left on device') as Error & { code: string };
      diskFullError.code = 'ENOSPC';

      mockEnsureDir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(diskFullError);

      await expect(saveCacheManifest(testCacheDir, mockManifest)).rejects.toThrow(
        'No space left on device when saving cache manifest',
      );
    });
  });

  describe('Manifest validation scenarios', () => {
    it('should handle empty entries object', async () => {
      const emptyManifest: CacheManifest = { entries: {} };

      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(emptyManifest));

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toEqual(emptyManifest);
      expect(Object.keys(result!.entries)).toHaveLength(0);
    });

    it('should handle manifest with complex entry dependencies', async () => {
      const complexManifest: CacheManifest = {
        entries: {
          '/blog/post-1': {
            path: 'blog/post-1.html',
            inputsHash: 'complex123',
            deps: [
              'layout.eta',
              'blog-layout.eta',
              'post.eta',
              'styles/blog.css',
              'scripts/blog.js',
            ],
            tags: ['blog', 'post', 'published'],
            publishedAt: new Date(Date.now() - 86400000).toISOString(),
            renderedAt: new Date().toISOString(),
            ttlSeconds: 86400, // 24 hours
            maxAgeCapDays: 365,
          },
        },
      };

      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(complexManifest));

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toEqual(complexManifest);
      expect(result).toBeDefined();
      if (result) {
        const blogEntry = result.entries['/blog/post-1'];
        expect(blogEntry).toBeDefined();
        if (blogEntry) {
          expect(blogEntry.deps).toHaveLength(5);
          expect(blogEntry.tags).toContain('blog');
        }
      }
    });

    it('should handle manifest entries with all optional fields', async () => {
      const fullManifest: CacheManifest = {
        entries: {
          '/complete-page': {
            path: 'complete.html',
            inputsHash: 'full123',
            deps: ['layout.eta', 'header.eta', 'footer.eta'],
            tags: ['complete', 'full-featured'],
            publishedAt: '2024-01-01T00:00:00.000Z',
            renderedAt: '2024-03-15T10:00:00.000Z',
            ttlSeconds: 7200,
            maxAgeCapDays: 90,
          },
        },
      };

      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(fullManifest));

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toEqual(fullManifest);
      expect(result).toBeDefined();
      if (result) {
        const entry = result.entries['/complete-page'];
        expect(entry).toBeDefined();
        if (entry) {
          expect(entry.publishedAt).toBe('2024-01-01T00:00:00.000Z');
          expect(entry.maxAgeCapDays).toBe(90);
        }
      }
    });
  });
});
