import type { PageModel, CacheEntry, StatiConfig } from '../../types.js';
import { computeContentHash, computeFileHash, computeInputsHash } from './hash.js';
import { trackTemplateDependencies } from './deps.js';
import { computeEffectiveTTL, computeNextRebuildAt, isPageFrozen } from './ttl.js';

/**
 * Determines if a page should be rebuilt based on ISG logic.
 * Checks content changes, dependency changes, TTL expiration, and freeze status.
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

  // Check if inputs (content + dependencies) have changed
  const currentContentHash = computeContentHash(page.content, page.frontMatter);
  const deps = await trackTemplateDependencies(page, config);

  // Compute hashes for all dependencies
  const depsHashes: string[] = [];
  for (const dep of deps) {
    const depHash = await computeFileHash(dep);
    if (depHash) {
      depsHashes.push(depHash);
    }
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

  // Check if TTL has expired
  const renderedAt = new Date(entry.renderedAt);
  const computeOptions: {
    now: Date;
    publishedAt?: Date;
    ttlSeconds: number;
    maxAgeCapDays?: number;
  } = {
    now: renderedAt,
    ttlSeconds: entry.ttlSeconds,
  };

  if (entry.publishedAt) {
    computeOptions.publishedAt = new Date(entry.publishedAt);
  }

  if (entry.maxAgeCapDays !== undefined) {
    computeOptions.maxAgeCapDays = entry.maxAgeCapDays;
  }

  const nextRebuildAt = computeNextRebuildAt(computeOptions);

  // If no next rebuild time (frozen), don't rebuild
  if (!nextRebuildAt) {
    return false;
  }

  // Rebuild if TTL has expired
  return now >= nextRebuildAt;
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

  // Get max age cap from front matter or config
  let maxAgeCapDays = isgConfig.maxAgeCapDays;
  if (typeof page.frontMatter.maxAgeCapDays === 'number') {
    maxAgeCapDays = page.frontMatter.maxAgeCapDays;
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

/**
 * Helper function to determine the output path for a page.
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
