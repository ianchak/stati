import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import type { CacheManifest, Logger } from '../../../src/types/index.js';

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
} from '../../../src/core/isg/manifest.js';
import { createStaleEntry } from '../../../src/core/isg/stale.js';

describe('ISG Cache Manifest', () => {
  const testCacheDir = join('test', 'cache');
  const manifestPath = join(testCacheDir, 'manifest.json');

  const createLogger = (): Logger => ({
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  });

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

    it('should keep the stylesheet paths the last build linked', async () => {
      const stylesheets = { '/styles.css': '/_assets/styles-0A1B2C3D.css' };
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify({ entries: {}, stylesheets }));

      const result = await loadCacheManifest(testCacheDir);

      expect(result).toEqual({ entries: {}, stylesheets });
    });

    it('should drop stylesheet paths that are not an object of strings', async () => {
      mockPathExists.mockResolvedValue(true);
      for (const stylesheets of [['/styles.css'], { '/styles.css': 1 }, 'styles']) {
        mockReadFile.mockResolvedValue(JSON.stringify({ entries: {}, stylesheets }));

        expect(await loadCacheManifest(testCacheDir)).toEqual({ entries: {} });
      }
    });

    it('should warn and return null on read error', async () => {
      const logger = createLogger();
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('Read error'));

      const result = await loadCacheManifest(testCacheDir, logger);

      expect(result).toBeNull();
      expect(logger.warning).toHaveBeenCalledWith(
        `Failed to load cache manifest: Failed to read file ${manifestPath}: Read error. Starting with fresh cache.`,
      );
    });

    it('should name the cause of a permission error in the warning', async () => {
      const logger = createLogger();
      const permissionError = Object.assign(new Error('EACCES: permission denied'), {
        code: 'EACCES',
      });
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(permissionError);

      expect(await loadCacheManifest(testCacheDir, logger)).toBeNull();
      expect(logger.warning).toHaveBeenCalledWith(
        expect.stringContaining('EACCES: permission denied'),
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should warn on the console when no logger is given', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('Read error'));

      expect(await loadCacheManifest(testCacheDir)).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Failed to load cache manifest'));
      warn.mockRestore();
    });

    it.each([
      ['an empty file', '', 'Cache manifest not found or empty, creating new cache'],
      ['a file of whitespace', ' \n', 'Cache manifest is empty, creating new cache'],
      [
        'JSON that is not an object',
        '42',
        'Cache manifest is not an object, ignoring existing cache',
      ],
      [
        'a manifest without entries',
        '{"navigationHash": "abc"}',
        'Cache manifest missing "entries" field, ignoring existing cache',
      ],
      [
        'entries that are not an object',
        '{"entries": []}',
        'Cache manifest "entries" field is not an object, ignoring existing cache',
      ],
    ])('should warn and return null for %s', async (_, content, message) => {
      const logger = createLogger();
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(content);

      expect(await loadCacheManifest(testCacheDir, logger)).toBeNull();
      expect(logger.warning).toHaveBeenCalledWith(message);
    });

    it('should return null on invalid JSON', async () => {
      const logger = createLogger();
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('invalid json');

      const result = await loadCacheManifest(testCacheDir, logger);

      expect(result).toBeNull();
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('invalid JSON'));
    });

    it('should keep the pages a manifest that is cut short still lists, as stale entries', async () => {
      const logger = createLogger();
      const entry = JSON.stringify({ path: '/a.html', inputsHash: 'a', deps: [], tags: ['x'] });
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        `{"entries": {"/index.html": ${entry}, "/blog/my post.html": ${entry}, "/blog/post.html": {"path": "/blo`,
      );

      const result = await loadCacheManifest(testCacheDir, logger);

      expect(result).toEqual({
        entries: {
          '/index.html': createStaleEntry('/index.html'),
          '/blog/my post.html': createStaleEntry('/blog/my post.html'),
          '/blog/post.html': createStaleEntry('/blog/post.html'),
        },
      });
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('invalid JSON'));
    });

    it('should not take stylesheet paths or field names for pages in a damaged manifest', async () => {
      const logger = createLogger();
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        '{"stylesheets": {"/styles.css": "/_assets/styles-ABC.css"}, "entries": {"/a.html": {"path": "/a.html", "deps": ["x.html"',
      );

      const result = await loadCacheManifest(testCacheDir, logger);

      expect(Object.keys(result!.entries)).toEqual(['/a.html']);
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

    it('should keep image fields and reset entries whose image fields are not string lists', async () => {
      const valid = {
        path: 'page1.html',
        inputsHash: 'abc123',
        deps: ['layout.eta'],
        tags: ['page'],
        renderedAt: new Date().toISOString(),
        ttlSeconds: 3600,
        assetDeps: ['site/photo.png'],
        images: ['_img/photo-0123abcd.png'],
      };
      const logger = createLogger();
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          entries: {
            '/page1': valid,
            '/page2': { ...valid, path: 'page2.html', assetDeps: 'site/photo.png' },
            '/page3': { ...valid, path: 'page3.html', images: [42] },
          },
        }),
      );

      const result = await loadCacheManifest(testCacheDir, logger);

      expect(result!.entries).toEqual({
        '/page1': valid,
        '/page2': createStaleEntry('/page2'),
        '/page3': createStaleEntry('/page3'),
      });
      expect(logger.warning).toHaveBeenCalledWith('Reset 2 invalid cache entries');
      expect(logger.warning).toHaveBeenCalledWith(
        'Invalid cache entry for /page2: "assetDeps" must be an array of strings',
      );
      expect(logger.warning).toHaveBeenCalledWith(
        'Invalid cache entry for /page3: "images" must be an array of strings',
      );
    });
  });

  describe('Entries the merged rules reset', () => {
    it('should reset entries with values the rebuild check used to reject or ignore', async () => {
      const entry = {
        path: '/a.html',
        inputsHash: 'a',
        deps: [],
        tags: [],
        renderedAt: '2024-03-15T10:00:00.000Z',
        ttlSeconds: 60,
      };
      const logger = createLogger();
      mockPathExists.mockResolvedValue(true);
      // JSON reads 1e999 as Infinity
      const infiniteCap = JSON.stringify({ ...entry, path: '/d.html', maxAgeCapDays: 1 }).replace(
        '"maxAgeCapDays":1',
        '"maxAgeCapDays":1e999',
      );
      mockReadFile.mockResolvedValue(
        `{"entries": {` +
          `"/a.html": ${JSON.stringify(entry)}, ` +
          `"/b.html": ${JSON.stringify({ ...entry, path: '/b.html', ttlSeconds: -1 })}, ` +
          `"/c.html": ${JSON.stringify({ ...entry, path: '/c.html', maxAgeCapDays: 0 })}, ` +
          `"/d.html": ${infiniteCap}, ` +
          `"/e.html": ${JSON.stringify({ ...entry, path: '/e.html', publishedAt: '' })}}}`,
      );

      const result = await loadCacheManifest(testCacheDir, logger);

      expect(result!.entries).toEqual({
        '/a.html': entry,
        '/b.html': createStaleEntry('/b.html'),
        '/c.html': createStaleEntry('/c.html'),
        '/d.html': createStaleEntry('/d.html'),
        '/e.html': createStaleEntry('/e.html'),
      });
      expect(vi.mocked(logger.warning).mock.calls.map(([message]) => message)).toEqual([
        'Invalid cache entry for /b.html: "ttlSeconds" must be a finite number of 0 or more',
        'Invalid cache entry for /c.html: "maxAgeCapDays" must be a finite number above 0',
        'Invalid cache entry for /d.html: "maxAgeCapDays" must be a finite number above 0',
        'Invalid cache entry for /e.html: "publishedAt" must be a valid date string',
        'Reset 4 invalid cache entries',
      ]);
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
    it('should keep boolean read flags and reset entries with other values', async () => {
      const entry = {
        path: '/a.html',
        inputsHash: 'a',
        deps: [],
        tags: [],
        renderedAt: '2024-03-15T10:00:00.000Z',
        ttlSeconds: 60,
      };
      const logger = createLogger();
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          entries: {
            '/a.html': { ...entry, readsCollection: true, readsNav: false },
            '/b.html': { ...entry, path: '/b.html', readsCollection: 'yes' },
            '/c.html': { ...entry, path: '/c.html', readsNav: 1 },
          },
        }),
      );

      const result = await loadCacheManifest(testCacheDir, logger);

      expect(Object.keys(result!.entries)).toEqual(['/a.html', '/b.html', '/c.html']);
      expect(result!.entries['/a.html']).toMatchObject({ readsCollection: true, readsNav: false });
      expect(result!.entries['/b.html']).toEqual(createStaleEntry('/b.html'));
      expect(result!.entries['/c.html']).toEqual(createStaleEntry('/c.html'));
      expect(logger.warning).toHaveBeenCalledWith(
        expect.stringContaining('"readsCollection" must be a boolean'),
      );
    });

    it('should keep recorded template lookups and reset entries with malformed ones', async () => {
      const entry = {
        path: '/a.html',
        inputsHash: 'a',
        deps: ['/project/site/layout.eta'],
        tags: [],
        renderedAt: '2024-03-15T10:00:00.000Z',
        ttlSeconds: 60,
        templatesRecorded: true,
      };
      const lookups = [
        { name: 'partials/header', from: 'blog', file: 'partials/header.eta' },
        { name: '/partials/promo', file: null },
      ];
      const logger = createLogger();
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          entries: {
            '/a.html': { ...entry, templateLookups: lookups },
            '/b.html': { ...entry, path: '/b.html', templateLookups: [{ name: 'x' }] },
            '/c.html': { ...entry, path: '/c.html', templateLookups: 'partials/header' },
            '/d.html': { ...entry, path: '/d.html', templatesRecorded: 'yes' },
          },
        }),
      );

      const result = await loadCacheManifest(testCacheDir, logger);

      expect(Object.keys(result!.entries)).toEqual(['/a.html', '/b.html', '/c.html', '/d.html']);
      expect(result!.entries['/a.html']?.templateLookups).toEqual(lookups);
      expect(result!.entries['/b.html']).toEqual(createStaleEntry('/b.html'));
      expect(logger.warning).toHaveBeenCalledWith(
        'Invalid cache entry for /b.html: "templateLookups" must be a list of { name, from?, file } objects',
      );
      expect(logger.warning).toHaveBeenCalledWith(
        expect.stringContaining('"templatesRecorded" must be a boolean'),
      );
    });

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
