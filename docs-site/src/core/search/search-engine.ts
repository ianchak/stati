/**
 * Search Engine
 *
 * Handles index loading, FlexSearch integration, and search queries.
 * Implements lazy loading - index is fetched only on first search interaction.
 */

import { Index } from 'flexsearch';
import type { SearchDocument, SearchIndex, SearchResult } from './types.js';

/** Meta tag name for search index discovery */
const SEARCH_INDEX_META_NAME = 'stati:search-index';

/** FlexSearch index instance */
let flexIndex: Index | null = null;

/** Document store for ID lookups */
const documentStore = new Map<string, SearchDocument>();

/** Loading state */
let loadingPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Gets the search index path from the meta tag.
 */
function getSearchIndexPath(): string | null {
  const meta = document.querySelector(`meta[name="${SEARCH_INDEX_META_NAME}"]`);
  return meta?.getAttribute('content') ?? null;
}

/**
 * Checks if search is available (meta tag exists).
 */
export function isSearchAvailable(): boolean {
  return getSearchIndexPath() !== null;
}

/**
 * Initializes the search index (lazy, called on first search).
 */
async function ensureIndexLoaded(): Promise<void> {
  if (isLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const indexPath = getSearchIndexPath();
    if (!indexPath) {
      throw new Error('[Search] Index meta tag not found');
    }

    const response = await fetch(indexPath);
    if (!response.ok) {
      throw new Error(`[Search] Failed to fetch search index: ${response.status}`);
    }

    const data: SearchIndex = await response.json();

    // Create FlexSearch index
    flexIndex = new Index({
      tokenize: 'forward',
      resolution: 9,
      cache: 100,
    });

    // Index all documents
    for (const doc of data.documents) {
      documentStore.set(doc.id, doc);
      const searchText = [doc.title, doc.heading, doc.content, ...(doc.tags ?? [])].join(' ');
      flexIndex.add(doc.id, searchText);
    }

    isLoaded = true;
    console.debug(`[Search] Indexed ${data.documentCount} documents`);
  })();

  return loadingPromise;
}

/**
 * Performs a search query.
 */
export async function search(query: string, limit = 10): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  await ensureIndexLoaded();
  if (!flexIndex) return [];

  const resultIds = flexIndex.search(query, { limit: limit * 2 }) as string[];

  const results: SearchResult[] = [];
  for (let i = 0; i < resultIds.length; i++) {
    const doc = documentStore.get(resultIds[i]);
    if (doc) {
      // Score based on position and heading level
      const levelBoost = (7 - doc.level) * 0.1;
      const positionScore = 1 - i / resultIds.length;
      results.push({
        document: doc,
        score: positionScore + levelBoost,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Navigates to a search result.
 */
export function navigateToResult(doc: SearchDocument): void {
  const url = doc.anchor ? `${doc.url}#${doc.anchor}` : doc.url;
  window.location.href = url;
}
