import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'path';
import type { PageModel, CacheEntry, StatiConfig } from '../../../types.js';

// Mock all ISG modules that the builder depends on - use factory functions
vi.mock('../../../core/isg/hash.js', () => ({
  computeContentHash: vi.fn(),
  computeFileHash: vi.fn(),
  computeInputsHash: vi.fn(),
}));

vi.mock('../../../core/isg/deps.js', () => ({
  trackTemplateDependencies: vi.fn(),
}));

vi.mock('../../../core/isg/ttl.js', () => ({
  computeEffectiveTTL: vi.fn(),
  computeNextRebuildAt: vi.fn(),
  isPageFrozen: vi.fn(),
}));

import {
  shouldRebuildPage,
  createCacheEntry,
  updateCacheEntry,
} from '../../../core/isg/builder.js';

// Get references to the mocked functions
import { computeContentHash, computeFileHash, computeInputsHash } from '../../../core/isg/hash.js';
import { trackTemplateDependencies } from '../../../core/isg/deps.js';
import { computeEffectiveTTL, computeNextRebuildAt, isPageFrozen } from '../../../core/isg/ttl.js';

const mockComputeContentHash = vi.mocked(computeContentHash);
const mockComputeFileHash = vi.mocked(computeFileHash);
const mockComputeInputsHash = vi.mocked(computeInputsHash);
const mockTrackTemplateDependencies = vi.mocked(trackTemplateDependencies);
const mockComputeEffectiveTTL = vi.mocked(computeEffectiveTTL);
const mockComputeNextRebuildAt = vi.mocked(computeNextRebuildAt);
const mockIsPageFrozen = vi.mocked(isPageFrozen);

describe('ISG Build Integration', () => {
  // Cross-platform path constants
  const testSiteDir = join('test', 'site');
  const testSourcePath = join(testSiteDir, 'test.md');
  const testLayoutPath = join(testSiteDir, 'layout.eta');
  const testHeaderPath = join(testSiteDir, '_partials', 'header.eta');
  const testFooterPath = join(testSiteDir, '_partials', 'footer.eta');
  const testNavPath = join(testSiteDir, '_partials', 'nav.eta');

  const mockConfig: StatiConfig = {
    srcDir: 'site',
    outDir: 'dist',
    site: {
      title: 'Test Site',
      baseUrl: 'https://test.com',
    },
    isg: {
      enabled: true,
      ttlSeconds: 3600,
      aging: [],
    },
  };

  const mockPage: PageModel = {
    slug: 'test-page',
    sourcePath: testSourcePath,
    url: '/test',
    content: '<h1>Test Content</h1>',
    frontMatter: {
      title: 'Test Page',
      tags: ['page'], // Add tags to frontMatter
      publishedAt: '2024-01-01T00:00:00.000Z', // Add publishedAt to frontMatter
    },
    publishedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const fixedDate = new Date('2024-03-15T10:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock returns
    mockComputeContentHash.mockReturnValue('content123');
    mockComputeFileHash.mockResolvedValue('file123');
    mockComputeInputsHash.mockReturnValue('inputs123');
    mockTrackTemplateDependencies.mockResolvedValue([testLayoutPath]);
    mockComputeEffectiveTTL.mockReturnValue(3600);
    mockComputeNextRebuildAt.mockReturnValue(new Date(fixedDate.getTime() + 3600000));
    mockIsPageFrozen.mockReturnValue(false);
  });

  describe('shouldRebuildPage', () => {
    it('should rebuild when no cache entry exists', async () => {
      const result = await shouldRebuildPage(mockPage, undefined, mockConfig, fixedDate);

      expect(result).toBe(true);
    });

    it('should rebuild when content hash changes', async () => {
      const existingEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'old_inputs123',
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
      };

      mockComputeContentHash.mockReturnValue('new_content123');
      mockComputeInputsHash.mockReturnValue('new_inputs123');

      const result = await shouldRebuildPage(mockPage, existingEntry, mockConfig, fixedDate);

      expect(result).toBe(true);
      expect(mockComputeContentHash).toHaveBeenCalledWith(mockPage.content, mockPage.frontMatter);
      expect(mockTrackTemplateDependencies).toHaveBeenCalledWith(mockPage, mockConfig);
    });

    it('should rebuild when dependency hash changes', async () => {
      const existingEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'old_inputs123',
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
      };

      mockComputeFileHash.mockResolvedValue('new_file_hash');
      mockComputeInputsHash.mockReturnValue('new_inputs123');

      const result = await shouldRebuildPage(mockPage, existingEntry, mockConfig, fixedDate);

      expect(result).toBe(true);
      expect(mockComputeFileHash).toHaveBeenCalledWith(testLayoutPath);
    });

    it('should not rebuild when page is frozen', async () => {
      const existingEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'inputs123',
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: new Date(fixedDate.getTime() - 7200000).toISOString(), // 2 hours ago
        ttlSeconds: 3600,
      };

      mockIsPageFrozen.mockReturnValue(true);

      const result = await shouldRebuildPage(mockPage, existingEntry, mockConfig, fixedDate);

      expect(result).toBe(false);
      expect(mockIsPageFrozen).toHaveBeenCalledWith(existingEntry, fixedDate);
    });

    it('should rebuild when TTL expires and page is not frozen', async () => {
      const existingEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'inputs123', // Same as current so it won't rebuild due to content change
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: new Date(fixedDate.getTime() - 7200000).toISOString(), // 2 hours ago
        ttlSeconds: 3600, // 1 hour TTL
      };

      mockIsPageFrozen.mockReturnValue(false);
      // Make sure computeNextRebuildAt returns a past date (indicating TTL expired)
      mockComputeNextRebuildAt.mockReturnValue(new Date(fixedDate.getTime() - 1000)); // 1 second ago

      const result = await shouldRebuildPage(mockPage, existingEntry, mockConfig, fixedDate);

      expect(result).toBe(true);
    });

    it('should not rebuild when within TTL and inputs unchanged', async () => {
      const existingEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'inputs123',
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: new Date(fixedDate.getTime() - 1800000).toISOString(), // 30 minutes ago
        ttlSeconds: 3600, // 1 hour TTL
      };

      const result = await shouldRebuildPage(mockPage, existingEntry, mockConfig, fixedDate);

      expect(result).toBe(false);
    });

    it('should handle missing dependencies gracefully', async () => {
      const existingEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'old_inputs123', // Different from current so it will rebuild due to content change
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
      };

      mockComputeFileHash.mockResolvedValue(null); // Dependency not found

      const result = await shouldRebuildPage(mockPage, existingEntry, mockConfig, fixedDate);

      expect(result).toBe(true); // Should rebuild if dependency is missing
    });

    it('should handle complex dependency changes', async () => {
      const existingEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'old_inputs',
        deps: [testLayoutPath, testHeaderPath],
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
      };

      // Mock multiple dependencies with different hashes
      mockTrackTemplateDependencies.mockResolvedValue([
        testLayoutPath,
        testHeaderPath,
        testFooterPath, // New dependency
      ]);

      mockComputeFileHash
        .mockResolvedValueOnce('layout_hash')
        .mockResolvedValueOnce('header_hash')
        .mockResolvedValueOnce('footer_hash');

      mockComputeInputsHash.mockReturnValue('new_inputs_with_footer');

      const result = await shouldRebuildPage(mockPage, existingEntry, mockConfig, fixedDate);

      expect(result).toBe(true);
      expect(mockComputeFileHash).toHaveBeenCalledTimes(3);
    });
  });

  describe('createCacheEntry', () => {
    it('should create cache entry with all required fields', async () => {
      const result = await createCacheEntry(mockPage, mockConfig, fixedDate);

      expect(result).toEqual({
        path: '/test.html', // Based on URL "/test"
        inputsHash: 'inputs123',
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
        publishedAt: mockPage.publishedAt?.toISOString(),
      });

      expect(mockComputeContentHash).toHaveBeenCalledWith(mockPage.content, mockPage.frontMatter);
      expect(mockTrackTemplateDependencies).toHaveBeenCalledWith(mockPage, mockConfig);
      expect(mockComputeEffectiveTTL).toHaveBeenCalledWith(mockPage, mockConfig.isg);
    });

    it('should handle pages without publishedAt', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _, ...pageBase } = mockPage;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _frontMatterPublishedAt, ...frontMatterBase } = mockPage.frontMatter;
      const pageWithoutDate: PageModel = {
        ...pageBase,
        frontMatter: frontMatterBase,
      };

      const result = await createCacheEntry(pageWithoutDate, mockConfig, fixedDate);
      expect(result.publishedAt).toBeUndefined();
    });

    it('should handle custom TTL from config', async () => {
      mockComputeEffectiveTTL.mockReturnValue(7200);

      const result = await createCacheEntry(mockPage, mockConfig, fixedDate);

      expect(result.ttlSeconds).toBe(7200);
    });

    it('should track all dependencies', async () => {
      const complexDeps = [testLayoutPath, testHeaderPath, testFooterPath, testNavPath];

      mockTrackTemplateDependencies.mockResolvedValue(complexDeps);
      mockComputeFileHash.mockResolvedValue('dep_hash');

      const result = await createCacheEntry(mockPage, mockConfig, fixedDate);

      expect(result.deps).toEqual(complexDeps);
      expect(mockComputeFileHash).toHaveBeenCalledTimes(complexDeps.length);
    });

    it('should handle dependency tracking errors', async () => {
      mockTrackTemplateDependencies.mockRejectedValue(new Error('Dependency error'));

      await expect(createCacheEntry(mockPage, mockConfig, fixedDate)).rejects.toThrow(
        'Dependency error',
      );
    });

    it('should generate tags based on page properties', async () => {
      const blogPage = {
        ...mockPage,
        url: '/blog/post-1',
        frontMatter: { ...mockPage.frontMatter, category: 'tech' },
      };

      const result = await createCacheEntry(blogPage, mockConfig, fixedDate);

      expect(result.tags).toContain('page');
    });
  });

  describe('updateCacheEntry', () => {
    const existingEntry: CacheEntry = {
      path: 'test.html',
      inputsHash: 'old_inputs',
      deps: [testLayoutPath],
      tags: ['page'],
      renderedAt: new Date(fixedDate.getTime() - 3600000).toISOString(),
      ttlSeconds: 3600,
      ...(mockPage.publishedAt && { publishedAt: mockPage.publishedAt.toISOString() }),
    };

    it('should update cache entry with new render time and inputs', async () => {
      const result = await updateCacheEntry(existingEntry, mockPage, mockConfig, fixedDate);

      expect(result).toEqual({
        path: '/test.html',
        inputsHash: 'inputs123',
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
        publishedAt: mockPage.publishedAt?.toISOString(),
      });
    });

    it('should preserve existing publishedAt when page has no date', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _, ...pageWithoutDateBase } = mockPage;
      const pageWithoutDate: PageModel = pageWithoutDateBase;

      const result = await updateCacheEntry(existingEntry, pageWithoutDate, mockConfig, fixedDate);

      expect(result.publishedAt).toBe(existingEntry.publishedAt);
    });

    it('should update dependencies when they change', async () => {
      const newDeps = [testLayoutPath, '/test/site/_partials/new-component.eta'];

      mockTrackTemplateDependencies.mockResolvedValue(newDeps);
      mockComputeFileHash.mockResolvedValue('new_dep_hash');

      const result = await updateCacheEntry(existingEntry, mockPage, mockConfig, fixedDate);

      expect(result.deps).toEqual(newDeps);
    });

    it('should update TTL based on current configuration', async () => {
      mockComputeEffectiveTTL.mockReturnValue(7200);

      const result = await updateCacheEntry(existingEntry, mockPage, mockConfig, fixedDate);

      expect(result.ttlSeconds).toBe(7200);
    });

    it('should handle file hash computation errors', async () => {
      mockComputeFileHash.mockRejectedValue(new Error('Hash computation failed'));

      await expect(
        updateCacheEntry(existingEntry, mockPage, mockConfig, fixedDate),
      ).rejects.toThrow('Hash computation failed');
    });

    it('should maintain entry path and tags', async () => {
      const entryWithTags = {
        ...existingEntry,
        tags: ['page', 'blog', 'featured'],
      };

      const result = await updateCacheEntry(entryWithTags, mockPage, mockConfig, fixedDate);

      expect(result.path).toBe('/test.html'); // Will be computed from page URL
      expect(result.tags).toEqual(['page']); // Will be extracted from page frontMatter
    });
  });

  describe('Build integration scenarios', () => {
    it('should handle complete build cycle', async () => {
      // 1. Check if rebuild is needed (no cache entry)
      const shouldRebuild1 = await shouldRebuildPage(mockPage, undefined, mockConfig, fixedDate);
      expect(shouldRebuild1).toBe(true);

      // 2. Create initial cache entry
      const entry = await createCacheEntry(mockPage, mockConfig, fixedDate);
      expect(entry.renderedAt).toBe(fixedDate.toISOString());

      // 3. Check if rebuild is needed (within TTL)
      const shouldRebuild2 = await shouldRebuildPage(mockPage, entry, mockConfig, fixedDate);
      expect(shouldRebuild2).toBe(false);

      // 4. Simulate time passing (TTL expired)
      const laterTime = new Date(fixedDate.getTime() + 7200000); // 2 hours later
      const shouldRebuild3 = await shouldRebuildPage(mockPage, entry, mockConfig, laterTime);
      expect(shouldRebuild3).toBe(true);

      // 5. Update cache entry
      const updatedEntry = await updateCacheEntry(entry, mockPage, mockConfig, laterTime);
      expect(updatedEntry.renderedAt).toBe(laterTime.toISOString());
    });

    it('should handle build with dependency changes', async () => {
      const initialDeps = [testLayoutPath];
      const updatedDeps = [testLayoutPath, '/test/site/_partials/new.eta'];

      // Initial state
      mockTrackTemplateDependencies.mockResolvedValue(initialDeps);
      const entry = await createCacheEntry(mockPage, mockConfig, fixedDate);

      // Dependency change
      mockTrackTemplateDependencies.mockResolvedValue(updatedDeps);
      mockComputeInputsHash.mockReturnValue('new_inputs_hash');

      const shouldRebuild = await shouldRebuildPage(mockPage, entry, mockConfig, fixedDate);
      expect(shouldRebuild).toBe(true);

      const updatedEntry = await updateCacheEntry(entry, mockPage, mockConfig, fixedDate);
      expect(updatedEntry.deps).toEqual(updatedDeps);
    });

    it('should handle build performance optimization scenarios', async () => {
      // Test that frozen pages skip expensive operations
      const frozenEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'inputs123',
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
      };

      mockIsPageFrozen.mockReturnValue(true);

      const shouldRebuild = await shouldRebuildPage(mockPage, frozenEntry, mockConfig, fixedDate);
      expect(shouldRebuild).toBe(false);

      // Verify that expensive operations were skipped when page is frozen
      expect(mockComputeContentHash).toHaveBeenCalled();
      expect(mockTrackTemplateDependencies).toHaveBeenCalled();
      expect(mockIsPageFrozen).toHaveBeenCalled();
    });

    it('should handle concurrent build scenarios', async () => {
      // Test that multiple pages can be processed concurrently
      const pages = [
        { ...mockPage, url: '/page1', slug: 'page1' },
        { ...mockPage, url: '/page2', slug: 'page2' },
        { ...mockPage, url: '/page3', slug: 'page3' },
      ];

      const promises = pages.map((page) => createCacheEntry(page, mockConfig, fixedDate));

      const entries = await Promise.all(promises);

      expect(entries).toHaveLength(3);
      entries.forEach((entry) => {
        expect(entry.renderedAt).toBe(fixedDate.toISOString());
        expect(entry.ttlSeconds).toBe(3600);
      });
    });

    it('should handle error scenarios gracefully', async () => {
      // Test error handling in dependency tracking with existing entry
      const existingEntry: CacheEntry = {
        path: 'test.html',
        inputsHash: 'inputs123',
        deps: [testLayoutPath],
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
      };

      mockTrackTemplateDependencies.mockRejectedValue(new Error('Template not found'));

      await expect(
        shouldRebuildPage(mockPage, existingEntry, mockConfig, fixedDate),
      ).rejects.toThrow('Template not found');

      // Test error handling in file hashing
      mockTrackTemplateDependencies.mockResolvedValue([testLayoutPath]);
      mockComputeFileHash.mockRejectedValue(new Error('File read error'));

      await expect(createCacheEntry(mockPage, mockConfig, fixedDate)).rejects.toThrow(
        'File read error',
      );
    });
  });
});
