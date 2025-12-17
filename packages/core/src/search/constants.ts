/**
 * Search index constants.
 * @module search/constants
 */

/** Meta tag name used to expose the search index path to client-side code */
export const SEARCH_INDEX_META_NAME = 'stati:search-index';

/** Current schema version for the search index */
export const SEARCH_INDEX_VERSION = '1.0.0';

/** Default configuration values for search index generation */
export const SEARCH_DEFAULTS = {
  /** Default base filename for the search index */
  indexName: 'search-index',
  /** Whether to include content hash in filename by default */
  hashFilename: true,
  /** Default maximum content length per section (in characters) */
  maxContentLength: 1000,
  /** Default maximum preview length for page-level entries (in characters) */
  maxPreviewLength: 500,
  /** Default heading levels to include in the index */
  headingLevels: [2, 3, 4, 5, 6] as readonly number[],
  /** Default exclude patterns */
  exclude: [] as readonly string[],
  /** Whether to include the home page by default */
  includeHomePage: false,
  /** Whether to auto-inject search index meta tag by default */
  autoInjectMetaTag: true,
} as const;
