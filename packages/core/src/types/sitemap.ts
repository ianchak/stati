/**
 * Sitemap generation type definitions
 */

import type { PageModel } from './content.js';
import type { StatiConfig } from './config.js';

/**
 * Change frequency hint for sitemap entries.
 * Indicates how frequently the page content is likely to change.
 *
 * @see https://www.sitemaps.org/protocol.html
 */
export type ChangeFrequency =
  'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

/**
 * A single entry in the sitemap.
 * Represents one URL with its associated metadata.
 */
export interface SitemapEntry {
  /** Full URL of the page; percent-encoded when the sitemap XML is written */
  url: string;
  /** Last modification date: `YYYY-MM-DD`, or a UTC date-time such as `2024-03-05T04:30:00Z` */
  lastmod?: string;
  /** Change frequency hint */
  changefreq?: ChangeFrequency;
  /** Priority of this URL relative to other URLs on the site (0.0 to 1.0) */
  priority?: number;
}

/**
 * Configuration for sitemap generation.
 * Controls how sitemaps are generated and which pages are included.
 */
export interface SitemapConfig {
  /** Enable sitemap generation (default: false) */
  enabled?: boolean;
  /** Default priority for all pages (0.0-1.0, default: 0.5); other values fail config loading */
  defaultPriority?: number;
  /** Default change frequency for all pages (default: 'monthly') */
  defaultChangeFreq?: ChangeFrequency;
  /** Glob patterns for pages to exclude from sitemap */
  excludePatterns?: string[];
  /** Glob patterns for pages to include in sitemap (if specified, only these are included) */
  includePatterns?: string[];
  /** Custom filter function for fine-grained control over page inclusion */
  filter?: (page: PageModel) => boolean;
  /**
   * Transform URL before adding to sitemap.
   * Useful for adding query parameters, changing domains, etc.
   */
  transformUrl?: (url: string, page: PageModel, config: StatiConfig) => string;
  /**
   * Transform sitemap entry before adding to sitemap.
   * Return null to exclude the entry. Allows complete control over entry metadata.
   */
  transformEntry?: (entry: SitemapEntry, page: PageModel) => SitemapEntry | null;
  /**
   * Priority rules based on URL patterns.
   * Applied in order, first match wins.
   *
   * @example
   * ```typescript
   * priorityRules: [
   *   { pattern: '/blog/**', priority: 0.8 },
   *   { pattern: '/docs/**', priority: 0.9 },
   *   { pattern: '/', priority: 1.0 }
   * ]
   * ```
   */
  priorityRules?: Array<{ pattern: string; priority: number }>;
  /**
   * Generate sitemap index file when splitting into multiple sitemaps.
   * Required when site has >50,000 URLs.
   */
  generateIndex?: boolean;
  /**
   * Write a Google News sitemap (the `news:` namespace) as a separate file next to
   * `sitemap.xml`. Without it no news sitemap is written. Like `sitemap.xml`, it is written
   * on production builds only, and `robots.txt` lists it when `robots.sitemap` is `true`.
   */
  news?: NewsSitemapConfig;
}

/**
 * Configuration for the Google News sitemap, set as `sitemap.news`.
 *
 * The file lists the pages that match `include` and were published within `maxAgeDays`, newest
 * first and at most 1000. Drafts, generated pages, later pages of a paginated listing, the 404
 * page and noindex pages are left out. The sitemap's own `excludePatterns`, `includePatterns`,
 * `filter`, `transformUrl` and `transformEntry` do not apply to it.
 *
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 *
 * @example
 * ```typescript
 * sitemap: {
 *   enabled: true,
 *   news: {
 *     include: ['/news/**'],
 *     publicationName: 'Stati News',
 *   },
 * }
 * ```
 */
export interface NewsSitemapConfig {
  /** Glob patterns for the URLs of the news articles, like `seo.articles.include` */
  include: string[];
  /** Name of the publication (default: `site.title`) */
  publicationName?: string;
  /**
   * ISO 639 language code of the publication, such as `en` or `zh-cn`
   * (default: the language of `site.defaultLocale`, or `en`)
   */
  language?: string;
  /** Articles published longer ago than this many days are left out (default: 2) */
  maxAgeDays?: number;
  /** File name in the output folder (default: `news-sitemap.xml`) */
  filename?: string;
}

/**
 * Result of sitemap generation.
 * Contains the generated XML and metadata about the sitemap.
 */
export interface SitemapGenerationResult {
  /** Generated sitemap XML string (index XML if multiple sitemaps) */
  xml: string;
  /** Number of entries in the sitemap(s) */
  entryCount: number;
  /** Size of the main sitemap/index in bytes */
  sizeInBytes: number;
  /** Individual sitemap files (when split into multiple sitemaps) */
  sitemaps?: Array<{ filename: string; xml: string }>;
}

/**
 * Result of Google News sitemap generation.
 */
export interface NewsSitemapGenerationResult {
  /** Generated news sitemap XML string */
  xml: string;
  /** Number of articles in the sitemap */
  entryCount: number;
  /** Size of the sitemap in bytes */
  sizeInBytes: number;
  /** File name to write it to in the output folder */
  filename: string;
}
