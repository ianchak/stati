import { join } from 'path';
import { loadCacheManifest, saveCacheManifest } from './isg/manifest.js';
import type { CacheEntry } from '../types.js';

/**
 * Invalidation result containing affected cache entries.
 */
export interface InvalidationResult {
  /** Number of cache entries invalidated */
  invalidatedCount: number;
  /** Paths of invalidated pages */
  invalidatedPaths: string[];
  /** Whether the entire cache was cleared */
  clearedAll: boolean;
}

/**
 * Parses an invalidation query string into individual query terms.
 * Supports space-separated values and quoted strings.
 *
 * @param query - The query string to parse
 * @returns Array of parsed query terms
 *
 * @example
 * ```typescript
 * parseInvalidationQuery('tag:blog path:/posts') // ['tag:blog', 'path:/posts']
 * parseInvalidationQuery('"tag:my tag" path:"/my path"') // ['tag:my tag', 'path:/my path']
 * ```
 */
export function parseInvalidationQuery(query: string): string[] {
  const terms: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    if (char === '"' || char === "'") {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else {
        current += char;
      }
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        terms.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    terms.push(current.trim());
  }

  return terms;
}

/**
 * Checks if a cache entry matches a specific invalidation term.
 *
 * @param entry - Cache entry to check
 * @param path - The page path for this entry
 * @param term - Invalidation term to match against
 * @returns True if the entry matches the term
 *
 * @example
 * ```typescript
 * matchesInvalidationTerm(entry, '/blog/post-1', 'tag:blog') // true if entry has 'blog' tag
 * matchesInvalidationTerm(entry, '/blog/post-1', 'path:/blog') // true (path prefix match)
 * ```
 */
export function matchesInvalidationTerm(entry: CacheEntry, path: string, term: string): boolean {
  // Parse term into type and value
  if (term.includes(':')) {
    const [type, value] = term.split(':', 2);

    // Ensure both type and value exist
    if (!type || !value) {
      return false;
    }

    switch (type.toLowerCase()) {
      case 'tag':
        return entry.tags.includes(value);

      case 'path':
        // Support both exact path match and prefix match
        return path === value || path.startsWith(value);

      case 'glob':
        // Simple glob pattern matching for paths
        return matchesGlob(path, value);

      default:
        console.warn(`Unknown invalidation term type: ${type}`);
        return false;
    }
  } else {
    // Plain term - search in tags and path
    return entry.tags.some((tag) => tag.includes(term)) || path.includes(term);
  }
}

/**
 * Simple glob pattern matching for paths.
 * Supports * and ** wildcards.
 *
 * @param path - Path to test
 * @param pattern - Glob pattern
 * @returns True if path matches pattern
 */
function matchesGlob(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '§DOUBLESTAR§')
    .replace(/\*/g, '[^/]*')
    .replace(/§DOUBLESTAR§/g, '.*');

  regexPattern = `^${regexPattern}$`;

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(path);
  } catch {
    console.warn(`Invalid glob pattern: ${pattern}`);
    return false;
  }
}

/**
 * Invalidates cache entries based on a query string.
 * Supports tag-based, path-based, and pattern-based invalidation.
 *
 * @param query - Invalidation query string, or undefined to clear all cache
 * @returns Promise resolving to invalidation result
 *
 * @example
 * ```typescript
 * // Invalidate all pages with 'blog' tag
 * await invalidate('tag:blog');
 *
 * // Invalidate specific path
 * await invalidate('path:/about');
 *
 * // Invalidate multiple criteria
 * await invalidate('tag:blog tag:news path:/posts');
 *
 * // Clear entire cache
 * await invalidate();
 * ```
 */
export async function invalidate(query?: string): Promise<InvalidationResult> {
  const cacheDir = join(process.cwd(), '.stati');
  const cacheManifestPath = join(cacheDir, 'cache-manifest.json');

  // Load existing cache manifest
  let cacheManifest = await loadCacheManifest(cacheManifestPath);

  if (!cacheManifest) {
    // No cache to invalidate
    return {
      invalidatedCount: 0,
      invalidatedPaths: [],
      clearedAll: false,
    };
  }

  const invalidatedPaths: string[] = [];

  if (!query || query.trim() === '') {
    // Clear entire cache
    invalidatedPaths.push(...Object.keys(cacheManifest.entries));
    cacheManifest.entries = {};

    await saveCacheManifest(cacheManifestPath, cacheManifest);

    return {
      invalidatedCount: invalidatedPaths.length,
      invalidatedPaths,
      clearedAll: true,
    };
  }

  // Parse query terms
  const terms = parseInvalidationQuery(query.trim());

  // Find entries that match any of the terms
  for (const [path, entry] of Object.entries(cacheManifest.entries)) {
    const shouldInvalidate = terms.some((term) => matchesInvalidationTerm(entry, path, term));

    if (shouldInvalidate) {
      delete cacheManifest.entries[path];
      invalidatedPaths.push(path);
    }
  }

  // Save updated cache manifest
  await saveCacheManifest(cacheManifestPath, cacheManifest);

  return {
    invalidatedCount: invalidatedPaths.length,
    invalidatedPaths,
    clearedAll: false,
  };
}
