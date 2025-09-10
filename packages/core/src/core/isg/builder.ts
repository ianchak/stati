import type { PageModel, CacheEntry, StatiConfig } from '../../types.js';
import { computeContentHash, computeFileHash, computeInputsHash } from './hash.js';
import { trackTemplateDependencies } from './deps.js';
import { computeEffectiveTTL, computeNextRebuildAt, isPageFrozen } from './ttl.js';
import { validatePageISGOverrides, extractNumericOverride } from './validation.js';

/**
 * Determines the output path for a page.
 */
function getOutputPath(page: PageModel): string {
  if (page.url === '/') {
    return '/index.html';
  } else if (page.url.endsWith('/')) {
    return `${page.url}index.html`;
  } else {
    return `${page.url}.html`;
  }
}

/**
 * Validates a cache entry structure to ensure it has all required fields.
 * Used to detect corrupted cache entries that should trigger a rebuild.
 */
function isValidCacheEntry(entry: CacheEntry): boolean {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  // Check required string fields
  const requiredStringFields = ['path', 'inputsHash', 'renderedAt'];
  for (const field of requiredStringFields) {
    if (typeof entry[field as keyof CacheEntry] !== 'string') {
      return false;
    }
  }

  // Check required number fields
  if (typeof entry.ttlSeconds !== 'number' || !Number.isFinite(entry.ttlSeconds)) {
    return false;
  }

  // Check required array fields
  if (!Array.isArray(entry.deps) || !Array.isArray(entry.tags)) {
    return false;
  }

  // Check that arrays contain only strings
  if (!entry.deps.every((dep) => typeof dep === 'string')) {
    return false;
  }

  if (!entry.tags.every((tag) => typeof tag === 'string')) {
    return false;
  }

  // Check optional fields
  if (entry.publishedAt !== undefined && typeof entry.publishedAt !== 'string') {
    return false;
  }

  if (entry.maxAgeCapDays !== undefined && typeof entry.maxAgeCapDays !== 'number') {
    return false;
  }

  return true;
}

/**
 * Determines if a page should be rebuilt based on ISG logic.
 * Checks content changes, dependency changes, TTL expiration, and freeze status.
 * Handles edge cases like missing dates, corrupted cache entries, and dependency errors.
 *
 * @param page - The page model to check
 * @param entry - Existing cache entry, or undefined if not cached
 * @param config - Stati configuration
 * @param now - Current date/time
 * @returns True if the page should be rebuilt
 *
 * @example
 * ```typescript
 * const shouldRebuild = await shouldRebuildPage(page, cacheEntry, config, new Date());
 * if (shouldRebuild) {
 *   console.log('Page needs rebuilding');
 * }
 * ```
 */
export async function shouldRebuildPage(
  page: PageModel,
  entry: CacheEntry | undefined,
  config: StatiConfig,
  now: Date,
): Promise<boolean> {
  // Always rebuild if no cache entry exists
  if (!entry) {
    return true;
  }

  try {
    // Validate the cache entry structure
    if (!isValidCacheEntry(entry)) {
      console.warn(`Invalid cache entry for ${page.url}, forcing rebuild`);
      return true;
    }

    // Check if inputs (content + dependencies) have changed
    const currentContentHash = computeContentHash(page.content, page.frontMatter);

    // Track dependencies with error handling
    let deps: string[];
    try {
      deps = await trackTemplateDependencies(page, config);
    } catch (error) {
      if (error instanceof Error && error.name === 'CircularDependencyError') {
        console.error(`Circular dependency detected for ${page.url}: ${error.message}`);
        throw error; // Re-throw circular dependency errors as they're fatal
      }

      // For other dependency errors, log warning and assume dependencies changed
      console.warn(
        `Failed to track dependencies for ${page.url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.warn('Assuming dependencies changed, forcing rebuild');
      return true;
    }

    // Compute hashes for all dependencies with error handling
    const depsHashes: string[] = [];
    let dependencyErrors = 0;

    for (const dep of deps) {
      try {
        const depHash = await computeFileHash(dep);
        if (depHash) {
          depsHashes.push(depHash);
        } else {
          dependencyErrors++;
          console.warn(`Missing dependency file: ${dep} (used by ${page.url})`);
        }
      } catch (error) {
        dependencyErrors++;
        console.warn(
          `Failed to hash dependency ${dep}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // If we had dependency errors, force rebuild to be safe
    if (dependencyErrors > 0) {
      console.warn(`${dependencyErrors} dependency errors for ${page.url}, forcing rebuild`);
      return true;
    }

    const currentInputsHash = computeInputsHash(currentContentHash, depsHashes);

    // If inputs changed, always rebuild
    if (currentInputsHash !== entry.inputsHash) {
      return true;
    }

    // If page is frozen (beyond max age cap), don't rebuild based on TTL
    if (isPageFrozen(entry, now)) {
      return false;
    }

    // Check if TTL has expired with safe date handling
    let renderedAt: Date;
    try {
      renderedAt = new Date(entry.renderedAt);
      if (isNaN(renderedAt.getTime())) {
        console.warn(`Invalid renderedAt date in cache entry for ${page.url}, forcing rebuild`);
        return true;
      }
    } catch (error) {
      console.warn(
        `Failed to parse renderedAt for ${page.url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return true;
    }

    // Handle edge case: invalid TTL values
    if (
      typeof entry.ttlSeconds !== 'number' ||
      entry.ttlSeconds < 0 ||
      !Number.isFinite(entry.ttlSeconds)
    ) {
      console.warn(
        `Invalid TTL value in cache entry for ${page.url}: ${entry.ttlSeconds}, forcing rebuild`,
      );
      return true;
    }

    const computeOptions: {
      now: Date;
      publishedAt?: Date;
      ttlSeconds: number;
      maxAgeCapDays?: number;
    } = {
      now: renderedAt,
      ttlSeconds: entry.ttlSeconds,
    };

    // Handle publishedAt edge cases
    if (entry.publishedAt) {
      try {
        const publishedDate = new Date(entry.publishedAt);
        if (!isNaN(publishedDate.getTime())) {
          computeOptions.publishedAt = publishedDate;
        } else {
          console.warn(
            `Invalid publishedAt date in cache entry for ${page.url}, ignoring for TTL calculation`,
          );
        }
      } catch (error) {
        console.warn(
          `Failed to parse publishedAt for ${page.url}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Handle maxAgeCapDays edge cases
    if (entry.maxAgeCapDays !== undefined) {
      if (
        typeof entry.maxAgeCapDays === 'number' &&
        entry.maxAgeCapDays > 0 &&
        Number.isFinite(entry.maxAgeCapDays)
      ) {
        computeOptions.maxAgeCapDays = entry.maxAgeCapDays;
      } else {
        console.warn(
          `Invalid maxAgeCapDays in cache entry for ${page.url}: ${entry.maxAgeCapDays}, ignoring`,
        );
      }
    }

    const nextRebuildAt = computeNextRebuildAt(computeOptions);

    // If no next rebuild time (frozen), don't rebuild
    if (!nextRebuildAt) {
      return false;
    }

    // Rebuild if TTL has expired
    return now >= nextRebuildAt;
  } catch (error) {
    // For any unexpected errors, log and force rebuild to be safe
    console.warn(
      `Error checking rebuild status for ${page.url}: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.warn('Forcing rebuild due to error');
    return true;
  }
}

/**
 * Creates a new cache entry for a page after it has been rendered.
 *
 * @param page - The page model
 * @param config - Stati configuration
 * @param renderedAt - When the page was rendered
 * @returns New cache entry
 *
 * @example
 * ```typescript
 * const entry = await createCacheEntry(page, config, new Date());
 * ```
 */
export async function createCacheEntry(
  page: PageModel,
  config: StatiConfig,
  renderedAt: Date,
): Promise<CacheEntry> {
  // Validate page-level ISG overrides first
  validatePageISGOverrides(page.frontMatter, page.sourcePath);

  // Compute content hash
  const contentHash = computeContentHash(page.content, page.frontMatter);

  // Track all template dependencies
  const deps = await trackTemplateDependencies(page, config);

  // Compute hashes for all dependencies
  const depsHashes: string[] = [];
  for (const dep of deps) {
    const depHash = await computeFileHash(dep);
    if (depHash) {
      depsHashes.push(depHash);
    }
  }

  const inputsHash = computeInputsHash(contentHash, depsHashes);

  // Extract tags from front matter
  let tags: string[] = [];
  if (Array.isArray(page.frontMatter.tags)) {
    tags = page.frontMatter.tags.filter((tag): tag is string => typeof tag === 'string');
  }

  // Get published date
  const publishedAt = getPublishedDateISO(page);

  // Compute effective TTL
  const isgConfig = config.isg || {};
  const ttlSeconds = computeEffectiveTTL(page, isgConfig);

  // Get max age cap from front matter or config using safe extraction
  let maxAgeCapDays = isgConfig.maxAgeCapDays;
  try {
    const frontMatterMaxAge = extractNumericOverride(
      page.frontMatter.maxAgeCapDays,
      'maxAgeCapDays',
      page.sourcePath,
    );
    if (frontMatterMaxAge !== undefined) {
      maxAgeCapDays = frontMatterMaxAge;
    }
  } catch (error) {
    // Log validation error but continue with default value
    console.warn(
      `ISG validation warning for ${page.sourcePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Determine output path
  const outputPath = getOutputPath(page);

  // Build cache entry with proper optional handling
  const cacheEntry: CacheEntry = {
    path: outputPath,
    inputsHash,
    deps,
    tags,
    renderedAt: renderedAt.toISOString(),
    ttlSeconds,
  };

  // Add optional fields only if they exist
  if (publishedAt) {
    cacheEntry.publishedAt = publishedAt;
  }

  if (maxAgeCapDays !== undefined) {
    cacheEntry.maxAgeCapDays = maxAgeCapDays;
  }

  return cacheEntry;
}

/**
 * Updates an existing cache entry with new information after rebuilding.
 *
 * @param entry - Existing cache entry
 * @param page - The page model
 * @param config - Stati configuration
 * @param renderedAt - When the page was rendered
 * @returns Updated cache entry
 *
 * @example
 * ```typescript
 * const updatedEntry = await updateCacheEntry(existingEntry, page, config, new Date());
 * ```
 */
export async function updateCacheEntry(
  entry: CacheEntry,
  page: PageModel,
  config: StatiConfig,
  renderedAt: Date,
): Promise<CacheEntry> {
  // Create a new entry and preserve the original publishedAt if not overridden
  const newEntry = await createCacheEntry(page, config, renderedAt);

  // Preserve original publishedAt if no new one is specified
  if (!newEntry.publishedAt && entry.publishedAt) {
    newEntry.publishedAt = entry.publishedAt;
  }

  return newEntry;
}

/**
 * Helper function to get published date as ISO string from page front matter.
 */
function getPublishedDateISO(page: PageModel): string | undefined {
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
          return date.toISOString();
        }
      }
      // Handle Date objects
      if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toISOString();
      }
    }
  }

  return undefined;
}
