/**
 * Search index generation configuration and type definitions.
 * @module types/search
 */

/**
 * Search index generation configuration.
 * When enabled, Stati generates a JSON search index at build time.
 *
 * @example
 * ```typescript
 * const config: StatiConfig = {
 *   search: {
 *     enabled: true,
 *     indexName: 'search-index',
 *     hashFilename: true,
 *     maxContentLength: 1000,
 *     maxPreviewLength: 500,
 *     headingLevels: [2, 3, 4],
 *     exclude: ['/private/**'],
 *     includeHomePage: false,
 *     autoInjectMetaTag: true,
 *     fields: ['description', 'date'],
 *   }
 * };
 * ```
 */
export interface SearchConfig {
  /** Enable search index generation. @default false */
  enabled: boolean;

  /** Base filename for the search index (without extension). @default 'search-index' */
  indexName?: string;

  /** Include content hash in filename for cache busting. @default true */
  hashFilename?: boolean;

  /** Maximum content length per section (in characters). @default 1000 */
  maxContentLength?: number;

  /** Maximum preview length for page-level entries (in characters). @default 500 */
  maxPreviewLength?: number;

  /** Heading levels to include in the index. @default [2, 3, 4, 5, 6] */
  headingLevels?: number[];

  /**
   * Glob patterns for the URLs of pages to exclude from the search index. A pattern must match
   * the whole URL: `/blog` leaves out `/blog` but not `/blog/post`. @default []
   */
  exclude?: string[];

  /** Include the home page (index) in the search index. @default false */
  includeHomePage?: boolean;

  /** Auto-inject search index meta tag into rendered HTML. @default true */
  autoInjectMetaTag?: boolean;

  /**
   * Front matter fields to copy onto each page-level document, under `fields`. Values must be
   * JSON-serializable: dates are written as ISO strings, and other values are skipped with a
   * warning. A page without a value for a field (or with `null`) leaves it out. Heading
   * documents never carry them.
   * @default []
   */
  fields?: string[];
}

/**
 * A searchable document representing a page section.
 * Each document is a searchable unit in the search index.
 *
 * @example
 * ```typescript
 * const doc: SearchDocument = {
 *   id: '/getting-started/installation#prerequisites',
 *   url: '/getting-started/installation',
 *   anchor: 'prerequisites',
 *   title: 'Installation',
 *   heading: 'Prerequisites',
 *   level: 2,
 *   content: 'Before installing Stati, ensure you have Node.js 22 or later...',
 *   breadcrumb: 'Getting Started > Installation',
 *   tags: ['setup', 'installation']
 * };
 * ```
 *
 * With `search.fields: ['description']`, a page-level document also carries
 * `fields: { description: '…' }`.
 *
 * @example
 * ```typescript
 * const pageDoc: SearchDocument = {
 *   id: '/getting-started/installation#top',
 *   url: '/getting-started/installation',
 *   anchor: '',
 *   title: 'Installation',
 *   heading: 'Installation',
 *   level: 1,
 *   content: 'Text before the first heading…',
 *   breadcrumb: 'Getting Started > Installation',
 *   fields: { description: 'Install Stati' }
 * };
 * ```
 */
export interface SearchDocument {
  /** Unique identifier (page URL + section anchor) */
  id: string;
  /** Page URL path from the site root, without the base path */
  url: string;
  /** Section anchor (heading ID), empty string for page-level entry */
  anchor: string;
  /** Page title from frontmatter */
  title: string;
  /** Section heading text */
  heading: string;
  /** Heading level (1 for page title, 2-6 for headings) */
  level: number;
  /** Text content of the section (stripped of HTML) */
  content: string;
  /** Breadcrumb path for display */
  breadcrumb: string;
  /** Optional tags from frontmatter */
  tags?: string[];
  /** Front matter values listed in `search.fields`, on page-level documents only */
  fields?: Record<string, unknown>;
}

/**
 * The complete search index structure written to JSON.
 * This is the output format for the generated search index file.
 *
 * @example
 * ```typescript
 * const index: SearchIndex = {
 *   version: '1.0.0',
 *   basePath: '',
 *   generatedAt: '2025-01-15T10:30:00.000Z',
 *   documentCount: 150,
 *   documents: [...]
 * };
 * ```
 */
export interface SearchIndex {
  /** Schema version for forward compatibility */
  version: string;
  /**
   * The path of `site.baseUrl` (`'/sub'`), or `''` when the site is served from the root.
   * Each document's `url` is relative to the site root, so a link is `basePath + url`.
   * Generated indexes always include it; treat a missing value as `''`.
   */
  basePath?: string;
  /** ISO timestamp when the index was generated */
  generatedAt: string;
  /** Total document count */
  documentCount: number;
  /** Array of searchable documents */
  documents: SearchDocument[];
}

/**
 * Metadata about the generated search index.
 * Used to pass search index information to templates and other parts of the build.
 */
export interface SearchIndexMetadata {
  /** Whether search index was generated */
  enabled: boolean;
  /** Full path to the search index file (e.g., '/search-index-a1b2c3d4.json') */
  indexPath: string;
  /** Document count in the index */
  documentCount: number;
}
