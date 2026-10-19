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
 * A template name that a page's render looked up, recorded so the cache can tell when the
 * name would resolve to a different file.
 *
 * @example
 * ```typescript
 * // stati.include('partials/header') on a page in site/blog/
 * const lookup: TemplateLookup = { name: 'partials/header', from: 'blog', file: 'partials/header.eta' };
 * // stati.include.has('/partials/promo') when site/partials/promo.eta does not exist
 * const miss: TemplateLookup = { name: '/partials/promo', file: null };
 * ```
 */
export interface TemplateLookup {
  /**
   * A name looked up from `from` towards the source directory, such as `partials/header`, or,
   * for names with one possible file (`/`, `./` and `../` names), that file's path from the
   * source directory with a leading `/`, such as `/partials/header`. Never ends in `.eta`.
   */
  readonly name: string;
  /**
   * The folder the name was looked up from, relative to the source directory, with `/`
   * separators; `''` is the source directory itself. Absent for paths.
   */
  readonly from?: string;
  /**
   * The template file the name resolved to, relative to the source directory, or `null` when
   * no file matched
   */
  readonly file: string | null;
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
 *   deps: ['/project/site/blog/layout.eta', '/project/site/base.eta'],
 *   templateLookups: [{ name: 'partials/header', from: 'blog', file: 'partials/header.eta' }],
 *   templatesRecorded: true,
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
  /** Hash of page content, template dependencies, and rendering asset inputs */
  readonly inputsHash: string;
  /**
   * Every template file the last render used (the layout, its parents, the templates it
   * included and the Open Graph template), as absolute POSIX paths, the page's layout first
   */
  readonly deps: readonly string[];
  /**
   * Template names the last render looked up and what each resolved to, including names that
   * matched no file. The page rebuilds when one of them would now resolve differently, for
   * example after a section adds a template at the same path.
   */
  templateLookups?: readonly TemplateLookup[];
  /**
   * Whether `deps` and `templateLookups` were recorded while the page rendered. A page whose
   * entry lacks it rebuilds once to record them.
   */
  templatesRecorded?: boolean;
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
  /**
   * Files found while rendering, such as the images a page displays. Their hashes are part
   * of `inputsHash`, so replacing an image rebuilds only the pages that show it.
   */
  assetDeps?: readonly string[];
  /** Generated image files this page references, relative to the output directory */
  images?: readonly string[];
  /**
   * Whether the last render read `stati.collection`. When it did, the collection's summary
   * (each member's URL, publish date and summary fields) is part of `inputsHash`, so the page
   * rebuilds when a page it lists changes. Missing in entries written before Stati recorded
   * it; such a page rebuilds once to record it.
   */
  readsCollection?: boolean;
  /**
   * Whether the last render read the navigation tree (`stati.nav` or `stati.page.navNode`).
   * When it did, the navigation hash is part of `inputsHash`.
   */
  readsNav?: boolean;
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
