/**
 * ISG (Incremental Static Generation) related type definitions
 */

/**
 * Aging rule for Incremental Static Generation (ISG) cache management.
 * Defines how cache TTL changes based on content age.
 *
 * @example
 * ```typescript
 * const rule: AgingRule = {
 *   untilDays: 7,      // Apply this rule for content older than 7 days
 *   ttlSeconds: 86400  // Cache for 24 hours
 * };
 * ```
 */
export interface AgingRule {
  /** Number of days after which this aging rule applies */
  untilDays: number;
  /** Cache time-to-live in seconds for content matching this age */
  ttlSeconds: number;
}

/**
 * Configuration for Incremental Static Generation (ISG) caching.
 * Enables smart caching strategies for static site generation.
 *
 * @example
 * ```typescript
 * const isgConfig: ISGConfig = {
 *   enabled: true,
 *   ttlSeconds: 3600,     // Default 1 hour cache
 *   maxAgeCapDays: 30,    // Max age for aging rules
 *   aging: [
 *     { untilDays: 7, ttlSeconds: 86400 },   // 1 day for week-old content
 *     { untilDays: 30, ttlSeconds: 604800 }  // 1 week for month-old content
 *   ]
 * };
 * ```
 */
export interface ISGConfig {
  /** Whether ISG caching is enabled */
  enabled?: boolean;
  /** Default cache time-to-live in seconds */
  ttlSeconds?: number;
  /** Maximum age in days for applying aging rules */
  maxAgeCapDays?: number;
  /** Array of aging rules for progressive cache extension */
  aging?: AgingRule[];
}

/**
 * Cache entry for a single page in the ISG cache manifest.
 * Contains all information needed to determine if a page needs rebuilding.
 *
 * @example
 * ```typescript
 * const entry: CacheEntry = {
 *   path: '/blog/my-post/index.html',
 *   inputsHash: 'sha256-abc123...',
 *   deps: ['/site/_layouts/post.eta', '/site/_partials/header.eta'],
 *   tags: ['blog', 'tutorial'],
 *   publishedAt: '2024-01-01T00:00:00.000Z',
 *   renderedAt: '2024-01-15T10:30:00.000Z',
 *   ttlSeconds: 21600,
 *   maxAgeCapDays: 365
 * };
 * ```
 */
export interface CacheEntry {
  /** Output path of the rendered page */
  readonly path: string;
  /** Hash of page content and all dependencies */
  readonly inputsHash: string;
  /** Array of file paths this page depends on (templates, partials) */
  readonly deps: readonly string[];
  /** Tags for invalidation and organization */
  readonly tags: readonly string[];
  /** ISO date when content was originally published */
  publishedAt?: string;
  /** ISO date when page was last rendered */
  readonly renderedAt: string;
  /** Effective TTL for this page in seconds */
  readonly ttlSeconds: number;
  /** Maximum age cap for this page in days */
  maxAgeCapDays?: number;
}

/**
 * ISG cache manifest containing all cached page entries.
 * Persisted as JSON in .stati/cache/manifest.json
 *
 * @example
 * ```typescript
 * const manifest: CacheManifest = {
 *   entries: {
 *     '/blog/post-1': { ... },
 *     '/about': { ... }
 *   },
 *   navigationHash: 'sha256-abc123...'
 * };
 * ```
 */
export interface CacheManifest {
  /** Map of page URLs to their cache entries */
  entries: Record<string, CacheEntry>;
  /** Hash of the navigation tree structure (title, url, order, children) */
  navigationHash?: string;
}
