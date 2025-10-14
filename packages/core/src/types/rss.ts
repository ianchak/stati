/**
 * RSS feed generation type definitions
 */

import type { PageModel } from './content.js';
import type { StatiConfig } from './config.js';

/**
 * Configuration for a single RSS feed.
 * Defines feed metadata, content selection, and item mapping.
 */
export interface RSSFeedConfig {
  /**
   * Filename for the RSS feed (e.g., 'feed.xml', 'blog.xml')
   * Will be written to the output directory.
   */
  filename: string;

  /**
   * Feed title (required)
   * @example 'My Blog Posts'
   */
  title: string;

  /**
   * Feed description (required)
   * @example 'Latest articles from my blog'
   */
  description: string;

  /**
   * Feed link - the URL of the website (not the feed itself)
   * If not provided, uses site.baseUrl from config
   * @example 'https://example.com'
   */
  link?: string;

  /**
   * Feed language code (optional)
   * @example 'en-US'
   */
  language?: string;

  /**
   * Copyright notice (optional)
   * @example 'Copyright 2024 My Company'
   */
  copyright?: string;

  /**
   * Managing editor email (optional)
   * @example 'editor@example.com (Jane Doe)'
   */
  managingEditor?: string;

  /**
   * Webmaster email (optional)
   * @example 'webmaster@example.com (John Smith)'
   */
  webMaster?: string;

  /**
   * Feed category (optional)
   * @example 'Technology'
   */
  category?: string;

  /**
   * TTL (Time To Live) in minutes - how long feed can be cached
   * @example 60
   */
  ttl?: number;

  /**
   * Image for the feed (optional)
   */
  image?: {
    /** URL of the image */
    url: string;
    /** Alt text for the image */
    title: string;
    /** URL the image links to */
    link: string;
    /** Width in pixels (max 144) */
    width?: number;
    /** Height in pixels (max 400) */
    height?: number;
  };

  /**
   * Content directory patterns to include in this feed.
   * Uses glob patterns to match content files.
   * @example ['blog/**', 'news/**']
   */
  contentPatterns?: string[];

  /**
   * Glob patterns for pages to exclude from feed
   * @example ['**\/draft-*', '**\/index.md']
   */
  excludePatterns?: string[];

  /**
   * Custom filter function for fine-grained control over item inclusion
   * @param page - The page to potentially include
   * @returns true to include, false to exclude
   */
  filter?: (page: PageModel) => boolean;

  /**
   * Maximum number of items to include in the feed
   * @example 20
   */
  maxItems?: number;

  /**
   * How to sort items (default: by publishedAt date, newest first)
   * - 'date-desc': Newest first (default)
   * - 'date-asc': Oldest first
   * - 'title-asc': Alphabetically by title
   * - 'title-desc': Reverse alphabetically by title
   * - 'custom': Use the sortFn function
   */
  sortBy?: 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'custom';

  /**
   * Custom sort function when sortBy is 'custom'
   * @param a - First page to compare
   * @param b - Second page to compare
   * @returns Negative if a < b, positive if a > b, 0 if equal
   */
  sortFn?: (a: PageModel, b: PageModel) => number;

  /**
   * Field mappings for RSS item elements.
   * Maps RSS fields to page properties or functions.
   */
  itemMapping?: {
    /**
     * Title for each item
     * Can be:
     * - A string property name from frontMatter (e.g., 'title')
     * - A function that returns the title
     * @default 'title'
     */
    title?: string | ((page: PageModel) => string);

    /**
     * Description for each item
     * Can be:
     * - A string property name from frontMatter (e.g., 'description', 'excerpt')
     * - A function that returns the description
     * @default 'description'
     */
    description?: string | ((page: PageModel) => string);

    /**
     * Link for each item (URL to the page)
     * By default uses the page's URL
     * Can be customized with a function
     */
    link?: (page: PageModel, config: StatiConfig) => string;

    /**
     * Publication date for each item
     * Can be:
     * - A string property name from frontMatter (e.g., 'publishedAt', 'date')
     * - A function that returns a Date or string
     * @default 'publishedAt' or 'date'
     */
    pubDate?: string | ((page: PageModel) => Date | string);

    /**
     * Author for each item
     * Can be:
     * - A string property name from frontMatter (e.g., 'author')
     * - A function that returns the author string
     */
    author?: string | ((page: PageModel) => string | undefined);

    /**
     * Category/categories for each item
     * Can be:
     * - A string property name from frontMatter (e.g., 'tags', 'category')
     * - A function that returns string or array of strings
     */
    category?: string | ((page: PageModel) => string | string[] | undefined);

    /**
     * GUID (globally unique identifier) for each item
     * By default uses the page URL
     * Can be customized with a function
     */
    guid?: (page: PageModel, config: StatiConfig) => string;

    /**
     * Whether to include full HTML content in description
     * If true, uses the rendered HTML content
     * If false, uses description field only
     * @default false
     */
    includeContent?: boolean;
  };

  /**
   * Custom enclosures (e.g., podcast episodes, media files)
   * Function that returns enclosure data for a page, or undefined if none
   */
  enclosure?: (page: PageModel) =>
    | {
        url: string;
        length: number; // File size in bytes
        type: string; // MIME type
      }
    | undefined;

  /**
   * Custom namespaces to add to the RSS feed
   * @example { 'content': 'http://purl.org/rss/1.0/modules/content/' }
   */
  namespaces?: Record<string, string>;

  /**
   * Custom XML elements to add to each item
   * Useful for extending RSS with custom tags
   * @example (page) => ({ 'customTag': page.frontMatter.customValue })
   */
  customItemElements?: (page: PageModel) => Record<string, string | number | boolean | undefined>;
}

/**
 * Main RSS configuration.
 * Can define multiple feeds with different content and settings.
 */
export interface RSSConfig {
  /**
   * Enable RSS feed generation (default: false)
   * RSS feeds are only generated in production builds, not in dev mode
   */
  enabled?: boolean;

  /**
   * Array of feed configurations.
   * Each feed can target different content with different settings.
   *
   * @example
   * ```typescript
   * feeds: [
   *   {
   *     filename: 'feed.xml',
   *     title: 'My Blog',
   *     description: 'Latest posts',
   *     contentPatterns: ['blog/**']
   *   },
   *   {
   *     filename: 'news.xml',
   *     title: 'News Feed',
   *     description: 'Latest news',
   *     contentPatterns: ['news/**']
   *   }
   * ]
   * ```
   */
  feeds: RSSFeedConfig[];
}

/**
 * Result of RSS feed generation.
 * Contains metadata about the generated feed.
 */
export interface RSSGenerationResult {
  /** Filename of the generated feed */
  filename: string;
  /** Number of items in the feed */
  itemCount: number;
  /** Size of the feed in bytes */
  sizeInBytes: number;
  /** Generated RSS XML content */
  xml: string;
}
