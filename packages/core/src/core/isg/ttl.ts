import type { PageModel, ISGConfig, AgingRule, CacheEntry } from '../../types.js';

/**
 * Clock drift tolerance in milliseconds.
 * Accounts for small differences between system clocks.
 */
const CLOCK_DRIFT_TOLERANCE_MS = 30000; // 30 seconds

/**
 * Safely gets the current UTC time with drift protection.
 * Ensures all ISG operations use consistent UTC time.
 *
 * @param providedDate - Optional date to use instead of system time (for testing)
 * @returns UTC Date object
 */
export function getSafeCurrentTime(providedDate?: Date): Date {
  const now = providedDate || new Date();

  // Ensure we're working with valid dates
  if (isNaN(now.getTime())) {
    console.warn('Invalid system date detected, using fallback date');
    return new Date('2025-01-01T00:00:00.000Z'); // Fallback to known good date
  }

  // Normalize to UTC to avoid timezone issues
  return new Date(now.toISOString());
}

/**
 * Safely parses and normalizes a date string to UTC.
 * Handles various date formats and timezone issues.
 *
 * @param dateStr - Date string to parse
 * @param context - Context for error messages
 * @returns Parsed UTC date or null if invalid
 */
export function parseSafeDate(dateStr: string, context?: string): Date | null {
  try {
    const parsed = new Date(dateStr);

    if (isNaN(parsed.getTime())) {
      if (context) {
        console.warn(`Invalid date "${dateStr}" in ${context}, ignoring`);
      }
      return null;
    }

    // Normalize to UTC
    return new Date(parsed.toISOString());
  } catch (error) {
    if (context) {
      console.warn(
        `Failed to parse date "${dateStr}" in ${context}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return null;
  }
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
    const defaultTTL = isgConfig.ttlSeconds ?? 21600; // 6 hours default
    return applyAgingRules(publishedAt, isgConfig.aging, defaultTTL, now);
  }

  // Fall back to default TTL
  return isgConfig.ttlSeconds ?? 21600; // 6 hours default
}

/**
 * Computes the next rebuild date for a page based on TTL and aging rules.
 * Returns null if the page is frozen (beyond max age cap).
 * Uses safe time handling with clock drift protection.
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
  const { publishedAt, ttlSeconds, maxAgeCapDays } = options;

  // Normalize the provided time to UTC
  const now = getSafeCurrentTime(options.now);

  // If there's a max age cap and published date, check if content is frozen
  if (maxAgeCapDays && publishedAt) {
    const normalizedPublishedAt = getSafeCurrentTime(publishedAt);
    const maxAgeMs = maxAgeCapDays * 24 * 60 * 60 * 1000;
    const ageMs = now.getTime() - normalizedPublishedAt.getTime();

    if (ageMs > maxAgeMs) {
      // Content is frozen, no rebuild needed
      return null;
    }
  }

  // Add clock drift tolerance to prevent rebuild loops
  const nextRebuildTime = now.getTime() + ttlSeconds * 1000 + CLOCK_DRIFT_TOLERANCE_MS;
  return new Date(nextRebuildTime);
}

/**
 * Determines if a page is frozen (beyond its max age cap).
 * Frozen pages are not rebuilt unless their content changes.
 * Uses safe time handling to avoid timezone issues.
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

  const safeNow = getSafeCurrentTime(now);
  const publishedAt = parseSafeDate(entry.publishedAt, `cache entry for ${entry.path}`);

  if (!publishedAt) {
    // If we can't parse the published date, don't freeze
    return false;
  }

  const maxAgeMs = entry.maxAgeCapDays * 24 * 60 * 60 * 1000;
  const ageMs = safeNow.getTime() - publishedAt.getTime();

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
 * Uses safe date parsing to handle timezone issues.
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
        const safeDate = parseSafeDate(
          value,
          `front-matter field "${field}" in ${page.sourcePath}`,
        );
        if (safeDate) {
          return safeDate;
        }
      }
      // Handle Date objects
      if (value instanceof Date) {
        const safeDate = getSafeCurrentTime(value);
        if (safeDate && !isNaN(safeDate.getTime())) {
          return safeDate;
        }
      }
    }
  }

  return null;
}
