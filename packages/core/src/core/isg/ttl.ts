import type { PageModel, ISGConfig, AgingRule, CacheEntry, Logger } from '../../types/index.js';
import {
  CLOCK_DRIFT_TOLERANCE_MS,
  DEFAULT_TTL_SECONDS,
  MILLISECONDS_PER_DAY,
} from '../../constants.js';
import { createFallbackLogger, getFrontMatterDate } from '../utils/index.js';
// dedup: time constants centralized in constants.ts

/**
 * Safely gets the current UTC time with drift protection.
 * Ensures all ISG operations use consistent UTC time.
 *
 * @param providedDate - Optional date to use instead of system time (for testing)
 * @param logger - Reports an invalid date; the console when omitted
 * @returns UTC Date object
 */
export function getSafeCurrentTime(providedDate?: Date, logger?: Logger): Date {
  const now = providedDate || new Date();

  // Ensure we're working with valid dates
  if (isNaN(now.getTime())) {
    (logger ?? createFallbackLogger()).warning('Invalid system date detected, using fallback date');
    return new Date('2025-01-01T00:00:00.000Z'); // Fallback to known good date
  }

  // Normalize to UTC to avoid timezone issues
  return new Date(now.toISOString());
}

/**
 * Computes the effective TTL for a page based on configuration and page-specific overrides.
 * Takes into account aging rules and front-matter overrides.
 * Uses safe time handling to avoid timezone issues.
 *
 * @param page - The page model
 * @param isgConfig - ISG configuration
 * @param currentTime - Optional current time (for testing)
 * @returns Effective TTL in seconds
 *
 * @example
 * ```typescript
 * const ttl = computeEffectiveTTL(page, config.isg);
 * console.log(`Page will be cached for ${ttl} seconds`);
 * ```
 */
export function computeEffectiveTTL(
  page: PageModel,
  isgConfig: ISGConfig,
  currentTime?: Date,
): number {
  // Check for page-specific TTL override in front matter
  if (typeof page.frontMatter.ttlSeconds === 'number' && page.frontMatter.ttlSeconds > 0) {
    return page.frontMatter.ttlSeconds;
  }

  // Get publishedAt date for aging calculations
  const publishedAt = getPublishedDate(page);
  const now = getSafeCurrentTime(currentTime);

  // Apply aging rules if we have a published date and aging rules configured
  if (publishedAt && isgConfig.aging && isgConfig.aging.length > 0) {
    const defaultTTL = isgConfig.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    return applyAgingRules(publishedAt, isgConfig.aging, defaultTTL, now);
  }

  // Fall back to default TTL
  return isgConfig.ttlSeconds ?? DEFAULT_TTL_SECONDS;
}

/**
 * Determines if a page is frozen: its publish date is more than `maxAgeCapDays` before `now`.
 * Frozen pages are not rebuilt for TTL reasons, only when their inputs change. This is the one
 * freeze rule; {@link isTtlExpired} applies it.
 *
 * @param entry - Cache entry for the page, as `parseCacheEntry` (`entry.ts`) accepts it
 * @param now - Current date/time
 * @param logger - Reports an invalid `now`; the console when omitted
 * @returns True if the page is frozen
 *
 * @example
 * ```typescript
 * if (isPageFrozen(cacheEntry, new Date(), logger)) {
 *   logger.info('Page is frozen, will not rebuild based on TTL');
 * }
 * ```
 */
export function isPageFrozen(entry: CacheEntry, now: Date, logger?: Logger): boolean {
  if (!entry.maxAgeCapDays || !entry.publishedAt) {
    return false;
  }

  const ageMs = getSafeCurrentTime(now, logger).getTime() - new Date(entry.publishedAt).getTime();
  return ageMs > entry.maxAgeCapDays * MILLISECONDS_PER_DAY;
}

/**
 * Determines if a cached page's TTL has run out, so it rebuilds although its inputs did not
 * change. The TTL runs from the entry's `renderedAt`, plus a clock drift tolerance that keeps
 * pages from rebuilding in a loop. A frozen page ({@link isPageFrozen}) never expires.
 *
 * @param entry - Cache entry for the page, as `parseCacheEntry` (`entry.ts`) accepts it
 * @param now - Current date/time
 * @param logger - Reports an invalid `now`; the console when omitted
 * @returns True if the page should rebuild because its TTL expired
 *
 * @example
 * ```typescript
 * if (isTtlExpired(cacheEntry, buildTime, logger)) {
 *   // Render the page again
 * }
 * ```
 */
export function isTtlExpired(entry: CacheEntry, now: Date, logger?: Logger): boolean {
  const safeNow = getSafeCurrentTime(now, logger);
  if (isPageFrozen(entry, safeNow)) {
    return false;
  }

  const expiresAt =
    new Date(entry.renderedAt).getTime() + entry.ttlSeconds * 1000 + CLOCK_DRIFT_TOLERANCE_MS;
  return safeNow.getTime() >= expiresAt;
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
 * Uses the shared field order from {@link getFrontMatterDate}.
 */
function getPublishedDate(page: PageModel): Date | null {
  return getFrontMatterDate(page.frontMatter) ?? null;
}
