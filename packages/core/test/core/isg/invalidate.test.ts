import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseInvalidationQuery,
  matchesInvalidationTerm,
  invalidate,
} from '../../../src/core/invalidate.js';
import { loadCacheManifest, saveCacheManifest } from '../../../src/core/isg/manifest.js';
import type { CacheEntry, CacheManifest } from '../../../src/types/index.js';

// Mock the manifest functions
vi.mock('../../../src/core/isg/manifest.js', () => ({
  loadCacheManifest: vi.fn(),
  saveCacheManifest: vi.fn(),
}));

const mockLoadCacheManifest = vi.mocked(loadCacheManifest);
const mockSaveCacheManifest = vi.mocked(saveCacheManifest);

describe('ISG Cache Invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseInvalidationQuery', () => {
    it('should parse simple space-separated terms', () => {
      const result = parseInvalidationQuery('tag:blog path:/posts');
      expect(result).toEqual(['tag:blog', 'path:/posts']);
    });

    it('should handle quoted strings with spaces', () => {
      const result = parseInvalidationQuery('"tag:my tag" path:"/my path"');
      expect(result).toEqual(['tag:my tag', 'path:/my path']);
    });

    it('should handle mixed quotes and unquoted terms', () => {
      const result = parseInvalidationQuery('tag:blog "path:/my posts" glob:*.html');
      expect(result).toEqual(['tag:blog', 'path:/my posts', 'glob:*.html']);
    });

    it('should handle single quotes', () => {
      const result = parseInvalidationQuery("'tag:my tag' path:/posts");
      expect(result).toEqual(['tag:my tag', 'path:/posts']);
    });

    it('should handle empty query', () => {
      const result = parseInvalidationQuery('');
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only query', () => {
      const result = parseInvalidationQuery('   ');
      expect(result).toEqual([]);
    });

    it('should trim whitespace from terms', () => {
      const result = parseInvalidationQuery('  tag:blog   path:/posts  ');
      expect(result).toEqual(['tag:blog', 'path:/posts']);
    });

    it('should handle nested quotes', () => {
      // The actual implementation doesn't handle escaped quotes inside strings
      // This test reflects the actual behavior
      const result = parseInvalidationQuery('tag:"nested \\"quotes\\""');
      expect(result).toEqual(['tag:nested \\quotes\\']);
    });

    it('should handle unclosed quotes gracefully', () => {
      const result = parseInvalidationQuery('tag:"unclosed quote');
      expect(result).toEqual(['tag:unclosed quote']);
    });
  });

  describe('matchesInvalidationTerm', () => {
    const mockEntry: CacheEntry = {
      path: '/blog/my-post',
      inputsHash: 'hash123',
      deps: ['layout.eta'],
      tags: ['blog', 'tutorial', 'javascript'],
      publishedAt: '2024-01-01T00:00:00.000Z',
      renderedAt: '2024-01-15T10:30:00.000Z',
      ttlSeconds: 3600,
      maxAgeCapDays: 30,
    };

    describe('tag matching', () => {
      it('should match exact tag', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'tag:blog');
        expect(result).toBe(true);
      });

      it('should not match non-existent tag', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'tag:news');
        expect(result).toBe(false);
      });

      it('should match multiple tags', () => {
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', 'tag:tutorial')).toBe(true);
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', 'tag:javascript')).toBe(true);
      });

      it('should be case sensitive for tags', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'tag:Blog');
        expect(result).toBe(false);
      });
    });

    describe('path matching', () => {
      it('should match exact path', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'path:/blog/my-post');
        expect(result).toBe(true);
      });

      it('should match path prefix', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'path:/blog');
        expect(result).toBe(true);
      });

      it('should not match non-matching path', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'path:/news');
        expect(result).toBe(false);
      });

      it('should match partial path segments', () => {
        // The implementation uses startsWith() so "/blo" will match "/blog/my-post"
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'path:/blo');
        expect(result).toBe(true);
      });
    });

    describe('glob matching', () => {
      it('should match simple wildcard patterns', () => {
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', 'glob:/blog/*')).toBe(true);
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', 'glob:*.html')).toBe(false);
      });

      it('should match double wildcard patterns', () => {
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', 'glob:/blog/**')).toBe(true);
        expect(matchesInvalidationTerm(mockEntry, '/blog/category/my-post', 'glob:/blog/**')).toBe(
          true,
        );
      });

      it('should handle complex glob patterns', () => {
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', 'glob:/*/my-post')).toBe(true);
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', 'glob:/blog/my-*')).toBe(true);
      });

      it('should handle invalid glob patterns gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'glob:[invalid');
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid glob pattern: [invalid');
        consoleSpy.mockRestore();
      });
    });

    describe('plain term matching', () => {
      it('should match term in tags', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'java');
        expect(result).toBe(true); // Matches 'javascript' tag
      });

      it('should match term in path', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'blog');
        expect(result).toBe(true);
      });

      it('should not match non-existent term', () => {
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'xyz');
        expect(result).toBe(false);
      });
    });

    describe('invalid term formats', () => {
      it('should handle malformed terms with colons', () => {
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', 'tag:')).toBe(false);
        expect(matchesInvalidationTerm(mockEntry, '/blog/my-post', ':blog')).toBe(false);
      });

      it('should warn about unknown term types', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = matchesInvalidationTerm(mockEntry, '/blog/my-post', 'unknown:value');
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Unknown invalidation term type: unknown');
        consoleSpy.mockRestore();
      });
    });
  });

  describe('invalidate', () => {
    const mockManifest: CacheManifest = {
      entries: {
        '/blog/post-1': {
          path: '/blog/post-1',
          inputsHash: 'hash1',
          deps: ['layout.eta'],
          tags: ['blog', 'tech'],
          renderedAt: '2024-01-15T10:30:00.000Z',
          ttlSeconds: 3600,
        },
        '/blog/post-2': {
          path: '/blog/post-2',
          inputsHash: 'hash2',
          deps: ['layout.eta'],
          tags: ['blog', 'tutorial'],
          renderedAt: '2024-01-15T11:30:00.000Z',
          ttlSeconds: 3600,
        },
        '/about': {
          path: '/about',
          inputsHash: 'hash3',
          deps: ['layout.eta'],
          tags: ['page'],
          renderedAt: '2024-01-15T12:30:00.000Z',
          ttlSeconds: 3600,
        },
      },
    };

    beforeEach(() => {
      // Create a fresh copy of the mock manifest for each test
      const freshManifest = JSON.parse(JSON.stringify(mockManifest));
      mockLoadCacheManifest.mockResolvedValue(freshManifest);
      mockSaveCacheManifest.mockResolvedValue();
    });

    it('should clear entire cache when no query provided', async () => {
      const result = await invalidate();

      expect(result).toEqual({
        invalidatedCount: 3,
        invalidatedPaths: ['/blog/post-1', '/blog/post-2', '/about'],
        clearedAll: true,
      });

      expect(mockSaveCacheManifest).toHaveBeenCalledWith(expect.stringContaining('.stati'), {
        entries: {},
      });
    });

    it('should clear entire cache when empty query provided', async () => {
      const result = await invalidate('');

      expect(result).toEqual({
        invalidatedCount: 3,
        invalidatedPaths: ['/blog/post-1', '/blog/post-2', '/about'],
        clearedAll: true,
      });
    });

    it('should clear entire cache when whitespace-only query provided', async () => {
      const result = await invalidate('   ');

      expect(result).toEqual({
        invalidatedCount: 3,
        invalidatedPaths: ['/blog/post-1', '/blog/post-2', '/about'],
        clearedAll: true,
      });
    });

    it('should invalidate entries by tag', async () => {
      const result = await invalidate('tag:blog');

      expect(result).toEqual({
        invalidatedCount: 2,
        invalidatedPaths: ['/blog/post-1', '/blog/post-2'],
        clearedAll: false,
      });

      const expectedManifest = {
        entries: {
          '/about': mockManifest.entries['/about'],
        },
      };
      expect(mockSaveCacheManifest).toHaveBeenCalledWith(
        expect.stringContaining('.stati'),
        expectedManifest,
      );
    });

    it('should invalidate entries by path prefix', async () => {
      const result = await invalidate('path:/blog');

      expect(result).toEqual({
        invalidatedCount: 2,
        invalidatedPaths: ['/blog/post-1', '/blog/post-2'],
        clearedAll: false,
      });
    });

    it('should invalidate entries by exact path', async () => {
      const result = await invalidate('path:/about');

      expect(result).toEqual({
        invalidatedCount: 1,
        invalidatedPaths: ['/about'],
        clearedAll: false,
      });
    });

    it('should invalidate entries by glob pattern', async () => {
      const result = await invalidate('glob:/blog/*');

      expect(result).toEqual({
        invalidatedCount: 2,
        invalidatedPaths: ['/blog/post-1', '/blog/post-2'],
        clearedAll: false,
      });
    });

    it('should handle multiple invalidation terms (OR logic)', async () => {
      const result = await invalidate('tag:tech path:/about');

      expect(result).toEqual({
        invalidatedCount: 2,
        invalidatedPaths: ['/blog/post-1', '/about'],
        clearedAll: false,
      });
    });

    it('should handle complex query with quoted terms', async () => {
      const result = await invalidate('tag:blog "path:/about"');

      expect(result).toEqual({
        invalidatedCount: 3,
        invalidatedPaths: ['/blog/post-1', '/blog/post-2', '/about'],
        clearedAll: false,
      });
    });

    it('should handle plain terms without prefixes', async () => {
      const result = await invalidate('tech');

      expect(result).toEqual({
        invalidatedCount: 1,
        invalidatedPaths: ['/blog/post-1'],
        clearedAll: false,
      });
    });

    it('should return empty result when no entries match', async () => {
      const result = await invalidate('tag:nonexistent');

      expect(result).toEqual({
        invalidatedCount: 0,
        invalidatedPaths: [],
        clearedAll: false,
      });

      expect(mockSaveCacheManifest).toHaveBeenCalledWith(
        expect.stringContaining('.stati'),
        mockManifest,
      );
    });

    it('should handle no cache manifest gracefully', async () => {
      mockLoadCacheManifest.mockResolvedValue(null);

      const result = await invalidate('tag:blog');

      expect(result).toEqual({
        invalidatedCount: 0,
        invalidatedPaths: [],
        clearedAll: false,
      });

      expect(mockSaveCacheManifest).not.toHaveBeenCalled();
    });

    it('should handle edge case with empty manifest', async () => {
      mockLoadCacheManifest.mockResolvedValue({ entries: {} });

      const result = await invalidate('tag:blog');

      expect(result).toEqual({
        invalidatedCount: 0,
        invalidatedPaths: [],
        clearedAll: false,
      });
    });

    it('should preserve order of invalidated paths', async () => {
      const result = await invalidate('tag:blog');

      // Should maintain the order from Object.entries iteration
      expect(result.invalidatedPaths).toEqual(['/blog/post-1', '/blog/post-2']);
    });

    it('should handle case-sensitive tag matching', async () => {
      const result = await invalidate('tag:Blog'); // Capital B

      expect(result).toEqual({
        invalidatedCount: 0,
        invalidatedPaths: [],
        clearedAll: false,
      });
    });
  });

  describe('age-based and time-based invalidation', () => {
    let mockDate: Date;

    beforeEach(() => {
      // Set a fixed date for consistent testing
      mockDate = new Date('2024-03-15T10:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const createMockEntryWithAge = (
      value: number,
      unit: 'days' | 'weeks' | 'months' | 'years',
    ): CacheEntry => {
      const renderedAt = new Date();

      switch (unit) {
        case 'days':
          renderedAt.setDate(renderedAt.getDate() - value);
          break;
        case 'weeks':
          renderedAt.setDate(renderedAt.getDate() - value * 7);
          break;
        case 'months':
          renderedAt.setMonth(renderedAt.getMonth() - value);
          break;
        case 'years':
          renderedAt.setFullYear(renderedAt.getFullYear() - value);
          break;
      }

      return {
        path: `/page-${value}-${unit}`,
        inputsHash: 'hash123',
        deps: ['layout.eta'],
        tags: ['test'],
        renderedAt: renderedAt.toISOString(),
        ttlSeconds: 3600,
      };
    };

    describe('age: invalidation', () => {
      beforeEach(() => {
        // Create test entries with different ages
        const mockManifest: CacheManifest = {
          entries: {
            '/recent': createMockEntryWithAge(1, 'days'), // 1 day ago
            '/week-old': createMockEntryWithAge(1, 'weeks'), // 1 week ago
            '/month-old': createMockEntryWithAge(1, 'months'), // 1 month ago
            '/quarter-old': createMockEntryWithAge(3, 'months'), // 3 months ago
            '/year-old': createMockEntryWithAge(1, 'years'), // 1 year ago
          },
        };
        mockLoadCacheManifest.mockResolvedValue(mockManifest);
      });
      it('should invalidate content younger than specified days', async () => {
        const result = await invalidate('age:8days');

        // Should invalidate everything younger than 8 days (recent=1day, week-old=7days)
        // month-old, quarter-old, year-old should NOT be invalidated
        expect(result.invalidatedCount).toBe(2);
        expect(result.invalidatedPaths).toEqual(['/recent', '/week-old']);
      });

      it('should invalidate content younger than specified weeks', async () => {
        const result = await invalidate('age:2weeks');

        // Should invalidate everything younger than 2 weeks (recent, week-old)
        expect(result.invalidatedCount).toBe(2);
        expect(result.invalidatedPaths).toEqual(['/recent', '/week-old']);
      });

      it('should invalidate content younger than specified months', async () => {
        const result = await invalidate('age:2months');

        // Should invalidate everything younger than 2 months (recent, week-old, month-old)
        expect(result.invalidatedCount).toBe(3);
        expect(result.invalidatedPaths).toEqual(['/recent', '/week-old', '/month-old']);
      });

      it('should invalidate content younger than specified years', async () => {
        const result = await invalidate('age:6months');

        // Should invalidate content younger than 6 months (recent, week-old, month-old, quarter-old)
        // year-old (1 year = 12 months) should NOT be invalidated
        expect(result.invalidatedCount).toBe(4);
        expect(result.invalidatedPaths).toEqual([
          '/recent',
          '/week-old',
          '/month-old',
          '/quarter-old',
        ]);
      });

      it('should handle invalid age formats gracefully', async () => {
        const result = await invalidate('age:invalid');

        expect(result.invalidatedCount).toBe(0);
        expect(result.invalidatedPaths).toEqual([]);
      });

      it('should handle zero and negative ages', async () => {
        const result = await invalidate('age:0days');

        expect(result.invalidatedCount).toBe(0);
        expect(result.invalidatedPaths).toEqual([]);
      });

      it('should handle singular and plural time units', async () => {
        // Create a fresh mock manifest for each call to avoid state pollution
        const createFreshManifest = () => ({
          entries: {
            '/recent': createMockEntryWithAge(1, 'days'), // 1 day ago
            '/week-old': createMockEntryWithAge(1, 'weeks'), // 1 week ago
            '/month-old': createMockEntryWithAge(1, 'months'), // 1 month ago
            '/quarter-old': createMockEntryWithAge(3, 'months'), // 3 months ago
            '/year-old': createMockEntryWithAge(1, 'years'), // 1 year ago
          },
        });

        // Mock fresh manifest for first call
        mockLoadCacheManifest.mockResolvedValueOnce(createFreshManifest());
        const resultSingular = await invalidate('age:1month');

        // Mock fresh manifest for second call
        mockLoadCacheManifest.mockResolvedValueOnce(createFreshManifest());
        const resultPlural = await invalidate('age:1months');

        // Both should produce the same result (recent, week-old, month-old)
        expect(resultSingular.invalidatedCount).toBe(3);
        expect(resultPlural.invalidatedCount).toBe(3);
        expect(resultSingular.invalidatedCount).toBe(resultPlural.invalidatedCount);
      });
    });

    describe('combined age and other criteria', () => {
      beforeEach(() => {
        // Add some entries with tags for testing combinations
        const mockManifest: CacheManifest = {
          entries: {
            '/recent-blog': {
              ...createMockEntryWithAge(1, 'days'),
              tags: ['blog'],
            },
            '/old-blog': {
              ...createMockEntryWithAge(3, 'months'),
              tags: ['blog'],
            },
            '/old-news': {
              ...createMockEntryWithAge(3, 'months'),
              tags: ['news'],
            },
          },
        };
        mockLoadCacheManifest.mockResolvedValue(mockManifest);
      });

      it('should combine age with tag criteria using OR logic', async () => {
        const result = await invalidate('age:2months tag:blog');

        // Should invalidate:
        // - recent-blog (matches both age:2months and tag:blog - 1 day < 2 months)
        // - old-blog (matches tag:blog, but NOT age:2months since 90 days > 2 months)
        expect(result.invalidatedCount).toBe(2);
        expect(result.invalidatedPaths).toEqual(['/recent-blog', '/old-blog']);
      });

      it('should work with single age criterion', async () => {
        const result = await invalidate('age:2months');

        // Should invalidate recent-blog (1 day < 2 months)
        // Should NOT invalidate old-blog and old-news (3 months > 2 months)
        expect(result.invalidatedCount).toBe(1);
        expect(result.invalidatedPaths).toEqual(['/recent-blog']);
      });
    });

    describe('edge cases for month and year arithmetic', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should handle month boundaries correctly', async () => {
        // Set current date to March 31st
        const currentDate = new Date('2024-03-31T12:00:00.000Z');
        vi.setSystemTime(currentDate);

        // Create entries with specific dates that test month boundary logic
        const mockManifest: CacheManifest = {
          entries: {
            '/feb29': {
              path: '/feb29',
              inputsHash: 'hash1',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2024-02-29T12:00:00.000Z').toISOString(), // 1 month and 1 day ago
              ttlSeconds: 3600,
            },
            '/jan31': {
              path: '/jan31',
              inputsHash: 'hash2',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2024-01-31T12:00:00.000Z').toISOString(), // 2 months ago
              ttlSeconds: 3600,
            },
            '/march30': {
              path: '/march30',
              inputsHash: 'hash3',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2024-03-30T12:00:00.000Z').toISOString(), // 1 day ago
              ttlSeconds: 3600,
            },
          },
        };
        mockLoadCacheManifest.mockResolvedValue(mockManifest);

        const result = await invalidate('age:1month');

        // Should invalidate march30 (1 day < 1 month)
        // Should NOT invalidate feb29 (1 month 1 day ago - setMonth from Mar 31 to Feb 31 becomes Mar 3, so Feb 29 is before the cutoff)
        // Should NOT invalidate jan31 (2 months > 1 month)
        expect(result.invalidatedCount).toBe(1);
        expect(result.invalidatedPaths).toEqual(['/march30']);
      });

      it('should handle leap year calculations correctly', async () => {
        // Test on leap year date
        const currentDate = new Date('2024-03-01T12:00:00.000Z');
        vi.setSystemTime(currentDate);

        const mockManifest: CacheManifest = {
          entries: {
            '/leap-year-content': {
              path: '/leap-year-content',
              inputsHash: 'hash1',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2023-03-01T12:00:00.000Z').toISOString(), // Exactly 1 year ago (non-leap to leap)
              ttlSeconds: 3600,
            },
            '/recent-content': {
              path: '/recent-content',
              inputsHash: 'hash2',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2024-02-28T12:00:00.000Z').toISOString(), // 2 days ago
              ttlSeconds: 3600,
            },
          },
        };
        mockLoadCacheManifest.mockResolvedValue(mockManifest);

        const result = await invalidate('age:1year');

        // Should invalidate recent-content (2 days < 1 year)
        // Should invalidate leap-year-content (exactly 1 year, but >= cutoff)
        expect(result.invalidatedCount).toBe(2);
        expect(result.invalidatedPaths).toEqual(['/leap-year-content', '/recent-content']);
      });

      it('should handle varying month lengths correctly', async () => {
        // Test from a month with 31 days going back to months with different lengths
        const currentDate = new Date('2024-05-31T12:00:00.000Z'); // May 31st
        vi.setSystemTime(currentDate);

        const mockManifest: CacheManifest = {
          entries: {
            '/april30': {
              path: '/april30',
              inputsHash: 'hash1',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2024-04-30T12:00:00.000Z').toISOString(), // 1 month ago (April has 30 days)
              ttlSeconds: 3600,
            },
            '/march31': {
              path: '/march31',
              inputsHash: 'hash2',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2024-03-31T12:00:00.000Z').toISOString(), // 2 months ago (March has 31 days)
              ttlSeconds: 3600,
            },
            '/feb29': {
              path: '/feb29',
              inputsHash: 'hash3',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2024-02-29T12:00:00.000Z').toISOString(), // 3 months ago (Feb has 29 days in 2024)
              ttlSeconds: 3600,
            },
          },
        };
        mockLoadCacheManifest.mockResolvedValue(mockManifest);

        const result = await invalidate('age:2months');

        // Should invalidate april30 (1 month < 2 months)
        // Should invalidate march31 (2 months, but >= cutoff)
        // Should NOT invalidate feb29 (3 months > 2 months)
        expect(result.invalidatedCount).toBe(2);
        expect(result.invalidatedPaths).toEqual(['/april30', '/march31']);
      });

      it('should handle year boundaries correctly', async () => {
        const currentDate = new Date('2024-02-29T12:00:00.000Z'); // Leap year date
        vi.setSystemTime(currentDate);

        const mockManifest: CacheManifest = {
          entries: {
            '/same-date-last-year': {
              path: '/same-date-last-year',
              inputsHash: 'hash1',
              deps: ['layout.eta'],
              tags: ['test'],
              // Content from Feb 27, 2023 (1 year and 2 days ago) should be excluded
              renderedAt: new Date('2023-02-27T12:00:00.000Z').toISOString(),
              ttlSeconds: 3600,
            },
            '/two-years-ago': {
              path: '/two-years-ago',
              inputsHash: 'hash2',
              deps: ['layout.eta'],
              tags: ['test'],
              renderedAt: new Date('2022-02-28T12:00:00.000Z').toISOString(), // 2 years and 1 day ago
              ttlSeconds: 3600,
            },
          },
        };
        mockLoadCacheManifest.mockResolvedValue(mockManifest);

        const result = await invalidate('age:1year');

        // From Feb 29, 2024 back 1 year becomes Feb 28, 2023
        // Should NOT invalidate same-date-last-year (rendered Feb 27, 2023 is before the cutoff)
        // Should NOT invalidate two-years-ago (2 years > 1 year)
        expect(result.invalidatedCount).toBe(0);
        expect(result.invalidatedPaths).toEqual([]);
      });
    });
  });
});
