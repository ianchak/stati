import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeEffectiveTTL,
  computeNextRebuildAt,
  isPageFrozen,
  applyAgingRules,
} from '../../../core/isg/ttl.js';
import type { PageModel, ISGConfig, AgingRule, CacheEntry } from '../../../types.js';

describe('ISG TTL and Aging Functions', () => {
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

  // Helper function to create PageModel objects
  const createTestPage = (frontMatter: Record<string, unknown> = {}): PageModel => ({
    slug: 'test-page',
    sourcePath: 'test.md',
    url: '/test',
    frontMatter: {
      title: 'Test Page',
      ...frontMatter,
    },
    content: 'Test content',
  });

  describe('computeEffectiveTTL', () => {
    const defaultISGConfig: ISGConfig = {
      ttlSeconds: 21600, // 6 hours
    };

    it('should return page-specific TTL override from front matter', () => {
      const page = createTestPage({
        ttlSeconds: 3600, // 1 hour override
      });

      const result = computeEffectiveTTL(page, defaultISGConfig);
      expect(result).toBe(3600);
    });

    it('should ignore invalid TTL override values', () => {
      const page = createTestPage({
        ttlSeconds: -100, // Invalid negative value
      });

      const result = computeEffectiveTTL(page, defaultISGConfig);
      expect(result).toBe(21600); // Should fall back to default
    });

    it('should use default TTL when no overrides or aging rules', () => {
      const page = createTestPage();

      const result = computeEffectiveTTL(page, defaultISGConfig);
      expect(result).toBe(21600);
    });

    it('should apply aging rules when publishedAt is available', () => {
      const agingRules: AgingRule[] = [
        { untilDays: 7, ttlSeconds: 3600 }, // 1 hour for content < 7 days
        { untilDays: 30, ttlSeconds: 86400 }, // 1 day for content < 30 days
      ];

      const configWithAging: ISGConfig = {
        ttlSeconds: 21600,
        aging: agingRules,
      };

      // Test content published 5 days ago (should use first rule)
      const fiveDaysAgo = new Date('2024-03-10T10:00:00.000Z');
      const page = createTestPage({
        publishedAt: fiveDaysAgo.toISOString(),
      });

      const result = computeEffectiveTTL(page, configWithAging);
      expect(result).toBe(3600); // Should use first aging rule
    });

    it('should handle missing publishedAt gracefully', () => {
      const configWithAging: ISGConfig = {
        ttlSeconds: 21600,
        aging: [{ untilDays: 7, ttlSeconds: 3600 }],
      };

      const page = createTestPage();

      const result = computeEffectiveTTL(page, configWithAging);
      expect(result).toBe(21600); // Should fall back to default
    });

    it('should use default TTL when ISG config has no ttlSeconds', () => {
      const minimalConfig: ISGConfig = {};

      const page = createTestPage();

      const result = computeEffectiveTTL(page, minimalConfig);
      expect(result).toBe(21600); // Should use hardcoded default
    });
  });

  describe('computeNextRebuildAt', () => {
    it('should compute next rebuild date from current time when no publishedAt', () => {
      const result = computeNextRebuildAt({
        now: mockDate,
        ttlSeconds: 3600, // 1 hour
      });

      const expected = new Date(mockDate.getTime() + 3600 * 1000);
      expect(result).toEqual(expected);
    });

    it('should compute next rebuild date from current time with publishedAt', () => {
      const publishedAt = new Date('2024-03-10T10:00:00.000Z');

      const result = computeNextRebuildAt({
        now: mockDate,
        publishedAt,
        ttlSeconds: 3600, // 1 hour
      });

      const expected = new Date(mockDate.getTime() + 3600 * 1000);
      expect(result).toEqual(expected);
    });

    it('should return null when page is frozen due to max age cap', () => {
      const publishedAt = new Date('2023-03-15T10:00:00.000Z'); // 1 year ago

      const result = computeNextRebuildAt({
        now: mockDate,
        publishedAt,
        ttlSeconds: 3600,
        maxAgeCapDays: 365, // 1 year cap, content is exactly at the limit
      });

      expect(result).toBeNull();
    });

    it('should return rebuild date when within max age cap', () => {
      const publishedAt = new Date('2024-01-15T10:00:00.000Z'); // 2 months ago

      const result = computeNextRebuildAt({
        now: mockDate,
        publishedAt,
        ttlSeconds: 3600,
        maxAgeCapDays: 365, // 1 year cap
      });

      const expected = new Date(mockDate.getTime() + 3600 * 1000);
      expect(result).toEqual(expected);
    });

    it('should handle edge case where publishedAt equals now', () => {
      const result = computeNextRebuildAt({
        now: mockDate,
        publishedAt: mockDate,
        ttlSeconds: 3600,
        maxAgeCapDays: 30,
      });

      const expected = new Date(mockDate.getTime() + 3600 * 1000);
      expect(result).toEqual(expected);
    });
  });

  describe('isPageFrozen', () => {
    it('should return false when no maxAgeCapDays is set', () => {
      const entry: CacheEntry = {
        path: '/test.html',
        inputsHash: 'hash123',
        deps: [],
        tags: [],
        renderedAt: mockDate.toISOString(),
        ttlSeconds: 3600,
        publishedAt: '2023-03-15T10:00:00.000Z', // 1 year ago
      };

      const result = isPageFrozen(entry, mockDate);
      expect(result).toBe(false);
    });

    it('should return false when no publishedAt is set', () => {
      const entry: CacheEntry = {
        path: '/test.html',
        inputsHash: 'hash123',
        deps: [],
        tags: [],
        renderedAt: mockDate.toISOString(),
        ttlSeconds: 3600,
        maxAgeCapDays: 365,
      };

      const result = isPageFrozen(entry, mockDate);
      expect(result).toBe(false);
    });

    it('should return true when page exceeds max age cap', () => {
      const entry: CacheEntry = {
        path: '/test.html',
        inputsHash: 'hash123',
        deps: [],
        tags: [],
        renderedAt: mockDate.toISOString(),
        ttlSeconds: 3600,
        publishedAt: '2022-03-15T10:00:00.000Z', // 2 years ago
        maxAgeCapDays: 365, // 1 year cap
      };

      const result = isPageFrozen(entry, mockDate);
      expect(result).toBe(true);
    });

    it('should return false when page is within max age cap', () => {
      const entry: CacheEntry = {
        path: '/test.html',
        inputsHash: 'hash123',
        deps: [],
        tags: [],
        renderedAt: mockDate.toISOString(),
        ttlSeconds: 3600,
        publishedAt: '2024-01-15T10:00:00.000Z', // 2 months ago
        maxAgeCapDays: 365, // 1 year cap
      };

      const result = isPageFrozen(entry, mockDate);
      expect(result).toBe(false);
    });

    it('should handle edge case where publishedAt equals current time', () => {
      const entry: CacheEntry = {
        path: '/test.html',
        inputsHash: 'hash123',
        deps: [],
        tags: [],
        renderedAt: mockDate.toISOString(),
        ttlSeconds: 3600,
        publishedAt: mockDate.toISOString(),
        maxAgeCapDays: 365,
      };

      const result = isPageFrozen(entry, mockDate);
      expect(result).toBe(false);
    });
  });

  describe('applyAgingRules', () => {
    const publishedAt = new Date('2024-03-10T10:00:00.000Z'); // 5 days ago
    const defaultTTL = 21600; // 6 hours

    it('should apply the most specific matching rule', () => {
      const agingRules: AgingRule[] = [
        { untilDays: 7, ttlSeconds: 3600 }, // 1 hour for < 7 days
        { untilDays: 30, ttlSeconds: 86400 }, // 1 day for < 30 days
        { untilDays: 365, ttlSeconds: 604800 }, // 1 week for < 365 days
      ];

      // Content is 5 days old, should match first rule
      const result = applyAgingRules(publishedAt, agingRules, defaultTTL, mockDate);
      expect(result).toBe(3600);
    });

    it('should use the last rule for very old content', () => {
      const veryOldDate = new Date('2023-01-15T10:00:00.000Z'); // Over 1 year ago
      const agingRules: AgingRule[] = [
        { untilDays: 7, ttlSeconds: 3600 },
        { untilDays: 30, ttlSeconds: 86400 },
        { untilDays: 365, ttlSeconds: 604800 },
      ];

      const result = applyAgingRules(veryOldDate, agingRules, defaultTTL, mockDate);
      expect(result).toBe(604800); // Should use the last rule
    });

    it('should return default TTL when no rules apply', () => {
      const recentDate = new Date('2024-03-14T10:00:00.000Z'); // 1 day ago
      const agingRules: AgingRule[] = [{ untilDays: 7, ttlSeconds: 3600 }];

      const result = applyAgingRules(recentDate, agingRules, defaultTTL, mockDate);
      expect(result).toBe(3600); // Should use the rule for < 7 days
    });

    it('should handle empty aging rules array', () => {
      const agingRules: AgingRule[] = [];

      const result = applyAgingRules(publishedAt, agingRules, defaultTTL, mockDate);
      expect(result).toBe(defaultTTL);
    });

    it('should handle unsorted aging rules correctly', () => {
      const agingRules: AgingRule[] = [
        { untilDays: 365, ttlSeconds: 604800 }, // 1 week for < 365 days
        { untilDays: 7, ttlSeconds: 3600 }, // 1 hour for < 7 days
        { untilDays: 30, ttlSeconds: 86400 }, // 1 day for < 30 days
      ];

      // Content is 5 days old, should still match the 7-day rule
      const result = applyAgingRules(publishedAt, agingRules, defaultTTL, mockDate);
      expect(result).toBe(3600);
    });

    it('should handle rules with same untilDays correctly', () => {
      const agingRules: AgingRule[] = [
        { untilDays: 7, ttlSeconds: 3600 },
        { untilDays: 7, ttlSeconds: 7200 }, // Duplicate rule
      ];

      const result = applyAgingRules(publishedAt, agingRules, defaultTTL, mockDate);
      expect(result).toBe(3600); // Should use the first matching rule
    });

    it('should handle content published in the future', () => {
      const futureDate = new Date('2024-03-20T10:00:00.000Z'); // 5 days in future
      const agingRules: AgingRule[] = [{ untilDays: 7, ttlSeconds: 3600 }];

      // Negative age should still work
      const result = applyAgingRules(futureDate, agingRules, defaultTTL, mockDate);
      expect(result).toBe(3600); // Should match the rule (negative age < 7 days)
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid date strings in publishedAt', () => {
      const page = createTestPage({
        publishedAt: 'not-a-date',
      });

      const config: ISGConfig = {
        ttlSeconds: 21600,
        aging: [{ untilDays: 7, ttlSeconds: 3600 }],
      };

      const result = computeEffectiveTTL(page, config);
      expect(result).toBe(21600); // Should fall back to default TTL
    });

    it('should handle various date field names in front matter', () => {
      const configs = [
        { fieldName: 'date', expectedUsed: true },
        { fieldName: 'published', expectedUsed: true },
        { fieldName: 'createdAt', expectedUsed: true },
        { fieldName: 'unknownField', expectedUsed: false },
      ];

      configs.forEach(({ fieldName, expectedUsed }) => {
        const page = createTestPage({
          [fieldName]: '2024-03-10T10:00:00.000Z',
        });

        const config: ISGConfig = {
          ttlSeconds: 21600,
          aging: [{ untilDays: 7, ttlSeconds: 3600 }],
        };

        const result = computeEffectiveTTL(page, config);

        if (expectedUsed) {
          expect(result).toBe(3600); // Should use aging rule
        } else {
          expect(result).toBe(21600); // Should use default TTL
        }
      });
    });

    it('should handle Date objects in front matter', () => {
      const publishedDate = new Date('2024-03-10T10:00:00.000Z');
      const page = createTestPage({
        publishedAt: publishedDate.toISOString(), // Convert Date to string
      });

      const config: ISGConfig = {
        ttlSeconds: 21600,
        aging: [{ untilDays: 7, ttlSeconds: 3600 }],
      };

      const result = computeEffectiveTTL(page, config);
      expect(result).toBe(3600); // Should use aging rule
    });
  });
});
