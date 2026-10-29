import type { CacheEntry } from '../../types/index.js';
import { STALE_INPUTS_HASH } from '../../constants.js';

/**
 * Marks a cache entry so that its page renders again. The entry stays in the manifest, which
 * is how pruning finds the output of a page that no longer exists.
 *
 * @param entry - The cache entry to mark
 * @returns A copy of the entry that never matches a page's inputs
 */
export function markStale(entry: CacheEntry): CacheEntry {
  return { ...entry, inputsHash: STALE_INPUTS_HASH };
}

/**
 * Creates a cache entry that records only where a page's output is and always renders again.
 * It takes the place of an entry that is invalid or can no longer be read.
 *
 * @param path - The cache key, the output path relative to the output directory
 * @returns A stale cache entry
 */
export function createStaleEntry(path: string): CacheEntry {
  return {
    path,
    inputsHash: STALE_INPUTS_HASH,
    deps: [],
    tags: [],
    renderedAt: new Date(0).toISOString(),
    ttlSeconds: 0,
  };
}
