import type { PageModel, ISGConfig, AgingRule, CacheEntry } from '../../types.js';

/**
 * Computes the effective TTL for a page based on configuration and page-specific overrides.
 * Takes into account aging rules and front-matter overrides.
 *
 * @param page - The page model
 * @param isgConfig - ISG configuration
 * @returns Effective TTL in seconds
 *
 * @example
 * ```typescript
 * const ttl = computeEffectiveTTL(page, config.isg);
 * console.log(`Page will be cached for ${ttl} seconds`);
 * ```
 */
export function computeEffectiveTTL(page: PageModel, isgConfig: ISGConfig): number {
  // Check for page-specific TTL override in front matter
  if (typeof page.frontMatter.ttlSeconds === 'number' && page.frontMatter.ttlSeconds > 0) {
    return page.frontMatter.ttlSeconds;
  }

  // Get publishedAt date for aging calculations
  const publishedAt = getPublishedDate(page);
  const now = new Date();

  // Apply aging rules if we have a published date and aging rules configured
  if (publishedAt && isgConfig.aging && isgConfig.aging.length > 0) {
    const defaultTTL = isgConfig.ttlSeconds ?? 21600; // 6 hours default
    return applyAgingRules(publishedAt, isgConfig.aging, defaultTTL, now);
  }

  // Fall back to default TTL
  return isgConfig.ttlSeconds ?? 21600; // 6 hours default
}

/**
 * Computes the next rebuild date for a page based on TTL and aging rules.
 * Returns null if the page is frozen (beyond max age cap).
 *
 * @param options - Configuration options
 * @param options.now - Current date/time
 * @param options.publishedAt - When the content was originally published
 * @param options.ttlSeconds - TTL for this page in seconds
 * @param options.maxAgeCapDays - Maximum age cap in days
 * @returns Next rebuild date, or null if frozen
 *
 * @example
 * ```typescript
 * const nextRebuild = computeNextRebuildAt({
 *   now: new Date(),
 *   publishedAt: new Date('2024-01-01'),
 *   ttlSeconds: 3600,
 *   maxAgeCapDays: 365
 * });
 * ```
 */
export function computeNextRebuildAt(options: {
  now: Date;
  publishedAt?: Date;
  ttlSeconds: number;
  maxAgeCapDays?: number;
}): Date | null {
  const { now, publishedAt, ttlSeconds, maxAgeCapDays } = options;

  // If no published date, use TTL from now
  if (!publishedAt) {
    return new Date(now.getTime() + ttlSeconds * 1000);
  }

  // Check if page is frozen due to max age cap
  if (maxAgeCapDays) {
    const maxAgeMs = maxAgeCapDays * 24 * 60 * 60 * 1000;
    const ageMs = now.getTime() - publishedAt.getTime();

    if (ageMs > maxAgeMs) {
      return null; // Page is frozen
    }
  }

  // Page is not frozen, apply TTL
  return new Date(now.getTime() + ttlSeconds * 1000);
}

/**
 * Determines if a page is frozen (beyond its max age cap).
 * Frozen pages are not rebuilt unless their content changes.
 *
 * @param entry - Cache entry for the page
 * @param now - Current date/time
 * @returns True if the page is frozen
 *
 * @example
 * ```typescript
 * if (isPageFrozen(cacheEntry, new Date())) {
 *   console.log('Page is frozen, will not rebuild based on TTL');
 * }
 * ```
 */
export function isPageFrozen(entry: CacheEntry, now: Date): boolean {
  if (!entry.maxAgeCapDays || !entry.publishedAt) {
    return false;
  }

  const publishedAt = new Date(entry.publishedAt);
  const maxAgeMs = entry.maxAgeCapDays * 24 * 60 * 60 * 1000;
  const ageMs = now.getTime() - publishedAt.getTime();

  return ageMs > maxAgeMs;
}

/**
 * Applies aging rules to determine the appropriate TTL for content based on its age.
 * Aging rules allow older content to be cached longer.
 *
 * @param publishedAt - When the content was originally published
 * @param agingRules - Array of aging rules (sorted by untilDays ascending)
 * @param defaultTTL - Default TTL to use if no rules match
 * @param now - Current date/time
 * @returns Appropriate TTL in seconds
 *
 * @example
 * ```typescript
 * const rules = [
 *   { untilDays: 7, ttlSeconds: 3600 },    // 1 hour for week-old content
 *   { untilDays: 30, ttlSeconds: 86400 }   // 1 day for month-old content
 * ];
 * const ttl = applyAgingRules(publishedAt, rules, 1800, new Date());
 * ```
 */
export function applyAgingRules(
  publishedAt: Date,
  agingRules: AgingRule[],
  defaultTTL: number,
  now: Date,
): number {
  const ageMs = now.getTime() - publishedAt.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  // Sort rules by untilDays in ascending order to apply the most specific rule
  const sortedRules = [...agingRules].sort((a, b) => a.untilDays - b.untilDays);

  // Find the most specific rule that applies
  let applicableRule: AgingRule | null = null;
  for (const rule of sortedRules) {
    if (ageDays <= rule.untilDays) {
      applicableRule = rule;
      break;
    }
  }

  // If no rule applies, use the last (highest untilDays) rule if age exceeds all rules
  if (!applicableRule && sortedRules.length > 0) {
    const lastRule = sortedRules[sortedRules.length - 1];
    if (lastRule && ageDays > lastRule.untilDays) {
      applicableRule = lastRule;
    }
  }

  return applicableRule ? applicableRule.ttlSeconds : defaultTTL;
}

/**
 * Helper function to extract published date from page front matter.
 * Supports various date formats and field names.
 */
function getPublishedDate(page: PageModel): Date | null {
  const frontMatter = page.frontMatter;

  // Try common field names for published date
  const dateFields = ['publishedAt', 'published', 'date', 'createdAt'];

  for (const field of dateFields) {
    const value = frontMatter[field];
    if (value) {
      // Handle string dates
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      // Handle Date objects
      if (value instanceof Date && !isNaN(value.getTime())) {
        return value;
      }
    }
  }

  return null;
}
