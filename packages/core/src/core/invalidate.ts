import { loadCacheManifest, saveCacheManifest } from './isg/manifest.js';
import type { CacheEntry } from '../types/index.js';
import { resolveCacheDir } from './utils/paths.js';

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

      case 'age':
        // Time-based invalidation: age:3months, age:1week, age:30days
        return matchesAge(entry, value);

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
  try {
    // Convert glob pattern to regex by processing character by character
    // This avoids the magic string replacement issue
    const regex = globToRegex(pattern);
    return regex.test(path);
  } catch {
    console.warn(`Invalid glob pattern: ${pattern}`);
    return false;
  }
}

/**
 * Converts a glob pattern to a regular expression.
 * Processes the pattern character by character to avoid placeholder conflicts.
 *
 * @param pattern - Glob pattern to convert
 * @returns Regular expression that matches the glob pattern
 */
function globToRegex(pattern: string): RegExp {
  let regexStr = '^';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    switch (char) {
      case '*':
        if (i + 1 < pattern.length && pattern[i + 1] === '*') {
          // Handle ** (matches any path including subdirectories)
          if (i + 2 < pattern.length && pattern[i + 2] === '/') {
            // **/ pattern - matches zero or more directories
            regexStr += '(?:.*/)?';
            i += 3;
          } else if (i + 2 === pattern.length) {
            // ** at end - matches everything
            regexStr += '.*';
            i += 2;
          } else {
            // ** not followed by / or end - treat as single *
            regexStr += '[^/]*';
            i += 1;
          }
        } else {
          // Single * matches any characters except path separator
          regexStr += '[^/]*';
          i += 1;
        }
        break;

      case '?':
        // ? matches any single character except path separator
        regexStr += '[^/]';
        i += 1;
        break;

      case '[': {
        // Handle character classes - find the closing bracket
        let closeIndex = i + 1;
        while (closeIndex < pattern.length && pattern[closeIndex] !== ']') {
          closeIndex++;
        }

        if (closeIndex >= pattern.length) {
          // No closing bracket found - this creates an invalid regex
          // Just add the character and let the regex constructor throw an error
          regexStr += char;
          i += 1;
        } else {
          // Valid character class - copy it as-is
          regexStr += pattern.slice(i, closeIndex + 1);
          i = closeIndex + 1;
        }
        break;
      }

      case '.':
      case '+':
      case '^':
      case '$':
      case '(':
      case ')':
      case ']':
      case '{':
      case '}':
      case '|':
      case '\\':
        // Escape regex special characters
        regexStr += '\\' + char;
        i += 1;
        break;

      default:
        // Regular character
        regexStr += char;
        i += 1;
        break;
    }
  }

  regexStr += '$';
  return new RegExp(regexStr);
}

/**
 * Checks if a cache entry matches an age-based invalidation term.
 * Supports various time units: days, weeks, months, years.
 *
 * @param entry - Cache entry to check
 * @param ageValue - Age specification (e.g., "3months", "1week", "30days")
 * @returns True if the entry is younger than the specified age
 *
 * @example
 * ```typescript
 * matchesAge(entry, "3months") // true if rendered within the last 3 months
 * matchesAge(entry, "1week")   // true if rendered within the last 1 week
 * ```
 */
function matchesAge(entry: CacheEntry, ageValue: string): boolean {
  const now = new Date();
  const renderedAt = new Date(entry.renderedAt);

  // Parse age value (e.g., "3months", "1week", "30days")
  const match = ageValue.match(/^(\d+)(days?|weeks?|months?|years?)$/i);
  if (!match || !match[1] || !match[2]) {
    console.warn(`Invalid age format: ${ageValue}. Use format like "3months", "1week", "30days"`);
    return false;
  }

  const numStr = match[1];
  const unit = match[2];
  const num = parseInt(numStr, 10);

  if (isNaN(num) || num <= 0) {
    console.warn(`Invalid age number: ${numStr}`);
    return false;
  }

  // Calculate cutoff date
  const cutoffDate = new Date(now);

  switch (unit.toLowerCase()) {
    case 'day':
    case 'days':
      cutoffDate.setDate(cutoffDate.getDate() - num);
      break;
    case 'week':
    case 'weeks':
      cutoffDate.setDate(cutoffDate.getDate() - num * 7);
      break;
    case 'month':
    case 'months':
      cutoffDate.setMonth(cutoffDate.getMonth() - num);
      break;
    case 'year':
    case 'years':
      cutoffDate.setFullYear(cutoffDate.getFullYear() - num);
      break;
    default:
      console.warn(`Unknown time unit: ${unit}`);
      return false;
  }

  // Entry matches if it was rendered after the cutoff date (i.e., younger than specified age)
  return renderedAt > cutoffDate;
}

/**
 * Invalidates cache entries based on a query string.
 * Supports tag-based, path-based, pattern-based, and time-based invalidation.
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
 * // Invalidate content younger than 3 months
 * await invalidate('age:3months');
 *
 * // Invalidate multiple criteria
 * await invalidate('tag:blog age:1week');
 *
 * // Clear entire cache
 * await invalidate();
 * ```
 */
export async function invalidate(query?: string): Promise<InvalidationResult> {
  const cacheDir = resolveCacheDir();

  // Load existing cache manifest
  const cacheManifest = await loadCacheManifest(cacheDir);

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

    await saveCacheManifest(cacheDir, cacheManifest);

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
  await saveCacheManifest(cacheDir, cacheManifest);

  return {
    invalidatedCount: invalidatedPaths.length,
    invalidatedPaths,
    clearedAll: false,
  };
}
