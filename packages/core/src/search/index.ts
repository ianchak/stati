/**
 * Search index generation module.
 * Provides build-time search index generation for Stati sites.
 *
 * @module search
 *
 * @example
 * ```typescript
 * import { generateSearchIndex, writeSearchIndex, SEARCH_INDEX_META_NAME } from '@stati/core/search';
 *
 * // Generate search index from searchable pages
 * const searchIndex = generateSearchIndex(searchablePages, config.search);
 *
 * // Write to output directory
 * const metadata = await writeSearchIndex(searchIndex, outDir, config.search);
 * console.log(`Generated search index at ${metadata.indexPath}`);
 * ```
 */

export {
  generateSearchIndex,
  writeSearchIndex,
  extractSectionsFromMarkdown,
  stripMarkdown,
  shouldExcludePage,
  generateContentHash,
  buildBreadcrumb,
  computeSearchIndexFilename,
} from './generator.js';
export type { SearchablePage } from './generator.js';

// Auto-injection
export { autoInjectSearchMeta } from './auto-inject.js';

export { SEARCH_INDEX_META_NAME, SEARCH_INDEX_VERSION, SEARCH_DEFAULTS } from './constants.js';

export type {
  SearchConfig,
  SearchDocument,
  SearchIndex,
  SearchIndexMetadata,
} from '../types/search.js';
