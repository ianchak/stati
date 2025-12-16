import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadCacheManifest, saveCacheManifest } from '../../src/core/isg/manifest.js';
import { normalizePathForComparison } from '../../src/core/utils/paths.utils.js';
import type { CacheManifest } from '../../src/types/index.js';

describe('Template Change Detection', () => {
  let testDir: string;
  let cacheDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'stati-template-test-'));
    cacheDir = join(testDir, '.stati');
    await mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Path normalization in cache manifest', () => {
    it('should match template paths regardless of path format', async () => {
      // Create a cache manifest with absolute paths (as stored by trackTemplateDependencies)
      const absoluteTemplatePath = join(testDir, 'site', '_partials', 'header.eta');

      const manifest: CacheManifest = {
        entries: {
          '/index.html': {
            path: '/index.html',
            inputsHash: 'test-hash',
            deps: [absoluteTemplatePath], // Stored as absolute path
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      };

      await saveCacheManifest(cacheDir, manifest);

      // Load the manifest
      const loadedManifest = await loadCacheManifest(cacheDir);
      expect(loadedManifest).not.toBeNull();
      expect(loadedManifest?.entries['/index.html']).toBeDefined();

      // Simulate different path formats that a file watcher might provide
      const watcherFormats = [
        absoluteTemplatePath, // Absolute path
        join('site', '_partials', 'header.eta'), // Relative path
        absoluteTemplatePath.replace(/\//g, '\\'), // Windows-style backslashes
      ];

      // All formats should match when normalized
      for (const watcherPath of watcherFormats) {
        const normalizedWatcher = normalizePathForComparison(watcherPath, testDir);
        const normalizedCached = normalizePathForComparison(absoluteTemplatePath, testDir);

        expect(normalizedWatcher).toBe(normalizedCached);
      }
    });

    it('should detect affected pages when template changes', async () => {
      // Setup: Create manifest with multiple pages depending on different templates
      const template1 = join(testDir, 'site', 'layout.eta');
      const template2 = join(testDir, 'site', '_partials', 'header.eta');
      const template3 = join(testDir, 'site', '_partials', 'footer.eta');

      const manifest: CacheManifest = {
        entries: {
          '/index.html': {
            path: '/index.html',
            inputsHash: 'hash1',
            deps: [template1, template2], // Depends on layout and header
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
          '/about.html': {
            path: '/about.html',
            inputsHash: 'hash2',
            deps: [template1, template3], // Depends on layout and footer
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
          '/contact.html': {
            path: '/contact.html',
            inputsHash: 'hash3',
            deps: [template1], // Only depends on layout
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      };

      await saveCacheManifest(cacheDir, manifest);

      // Test: Simulate header.eta changing (using different path format)
      const changedTemplatePath = join('site', '_partials', 'header.eta'); // Relative format
      const normalizedChangedPath = normalizePathForComparison(changedTemplatePath, testDir);

      // Find affected pages
      const loadedManifest = await loadCacheManifest(cacheDir);
      expect(loadedManifest).not.toBeNull();

      const affectedPages: string[] = [];
      for (const [pagePath, entry] of Object.entries(loadedManifest!.entries)) {
        const hasMatchingDep = entry.deps.some((dep) => {
          const normalizedDep = normalizePathForComparison(dep, testDir);
          return normalizedDep === normalizedChangedPath;
        });

        if (hasMatchingDep) {
          affectedPages.push(pagePath);
        }
      }

      // Only /index.html should be affected (it's the only one that depends on header.eta)
      expect(affectedPages).toHaveLength(1);
      expect(affectedPages).toContain('/index.html');
      expect(affectedPages).not.toContain('/about.html');
      expect(affectedPages).not.toContain('/contact.html');
    });

    it('should handle Windows paths in cache manifest', async () => {
      // Simulate a cache manifest that might have been created on Windows
      const windowsPath = 'C:\\project\\site\\_partials\\header.eta';

      const manifest: CacheManifest = {
        entries: {
          '/index.html': {
            path: '/index.html',
            inputsHash: 'test-hash',
            deps: [windowsPath],
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      };

      await saveCacheManifest(cacheDir, manifest);

      // Load and verify the path is stored correctly
      const loadedManifest = await loadCacheManifest(cacheDir);
      expect(loadedManifest).not.toBeNull();

      const storedDep = loadedManifest!.entries['/index.html']!.deps[0];

      // Normalize both the stored path and a POSIX version
      const normalizedStored = normalizePathForComparison(storedDep);
      const posixPath = 'C:/project/site/_partials/header.eta';
      const normalizedPosix = normalizePathForComparison(posixPath);

      // They should not contain backslashes after normalization
      expect(normalizedStored).not.toContain('\\');
      expect(normalizedPosix).not.toContain('\\');

      // The normalized Windows and POSIX paths should be equal
      expect(normalizedStored).toBe(normalizedPosix);
    });

    it('should handle relative paths with .. segments', async () => {
      const basePath = join(testDir, 'site', 'blog');
      const templatePath = join(basePath, '..', 'layout.eta'); // site/layout.eta
      const expectedPath = join(testDir, 'site', 'layout.eta');

      const manifest: CacheManifest = {
        entries: {
          '/blog/post.html': {
            path: '/blog/post.html',
            inputsHash: 'hash',
            deps: [templatePath],
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      };

      await saveCacheManifest(cacheDir, manifest);

      // Watcher might provide the simplified path
      const simplifiedPath = join('site', 'layout.eta');

      const normalizedStored = normalizePathForComparison(templatePath, testDir);
      const normalizedWatcher = normalizePathForComparison(simplifiedPath, testDir);
      const normalizedExpected = normalizePathForComparison(expectedPath, testDir);

      // All should resolve to the same normalized path
      expect(normalizedStored).toBe(normalizedExpected);
      expect(normalizedWatcher).toBe(normalizedExpected);
    });

    it('should not match different templates with similar names', async () => {
      const template1 = join(testDir, 'site', 'header.eta');
      const template2 = join(testDir, 'site', '_partials', 'header.eta');

      const manifest: CacheManifest = {
        entries: {
          '/page1.html': {
            path: '/page1.html',
            inputsHash: 'hash1',
            deps: [template1],
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
          '/page2.html': {
            path: '/page2.html',
            inputsHash: 'hash2',
            deps: [template2],
            tags: [],
            renderedAt: new Date().toISOString(),
            ttlSeconds: 3600,
          },
        },
      };

      await saveCacheManifest(cacheDir, manifest);

      // Change template2
      const changedPath = join('site', '_partials', 'header.eta');
      const normalizedChanged = normalizePathForComparison(changedPath, testDir);

      const loadedManifest = await loadCacheManifest(cacheDir);
      const affectedPages: string[] = [];

      for (const [pagePath, entry] of Object.entries(loadedManifest!.entries)) {
        const hasMatchingDep = entry.deps.some((dep) => {
          const normalizedDep = normalizePathForComparison(dep, testDir);
          return normalizedDep === normalizedChanged;
        });

        if (hasMatchingDep) {
          affectedPages.push(pagePath);
        }
      }

      // Only page2 should be affected
      expect(affectedPages).toHaveLength(1);
      expect(affectedPages).toContain('/page2.html');
      expect(affectedPages).not.toContain('/page1.html');
    });
  });

  describe('Backward compatibility', () => {
    it('should work with existing cache manifests', async () => {
      // Simulate an existing cache manifest with absolute POSIX paths (current format)
      const existingManifest: CacheManifest = {
        entries: {
          '/index.html': {
            path: '/index.html',
            inputsHash: 'existing-hash',
            deps: [
              '/home/user/project/site/layout.eta',
              '/home/user/project/site/_partials/header.eta',
            ],
            tags: ['home'],
            renderedAt: '2024-01-01T00:00:00.000Z',
            ttlSeconds: 3600,
          },
        },
      };

      await saveCacheManifest(cacheDir, existingManifest);

      // Load and verify
      const loaded = await loadCacheManifest(cacheDir);
      expect(loaded).not.toBeNull();
      expect(loaded?.entries['/index.html']?.deps).toHaveLength(2);

      // Paths should remain unchanged
      expect(loaded?.entries['/index.html']?.deps[0]).toBe('/home/user/project/site/layout.eta');
      expect(loaded?.entries['/index.html']?.deps[1]).toBe(
        '/home/user/project/site/_partials/header.eta',
      );
    });
  });
});
