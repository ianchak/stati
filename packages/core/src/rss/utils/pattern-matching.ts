/**
 * Shared pattern matching utilities for Stati
 * Provides glob pattern matching functionality used across RSS, sitemap, and other modules
 * @module utils/pattern-matching
 */

/**
 * Escapes regex special characters in a string, except glob wildcards (* and ?)
 * @param str - String to escape
 * @returns String with regex special characters escaped
 */
function escapeRegexExceptGlob(str: string): string {
  // Escape all regex special characters except * and ?
  return str.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts a glob pattern to a regular expression
 * Handles ** (match any directory depth) and * (match within directory)
 * @param pattern - Glob pattern to convert
 * @returns Regular expression for pattern matching
 */
function globToRegex(pattern: string): RegExp {
  // Normalize pattern to use forward slashes
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Handle different glob patterns
  if (normalizedPattern.includes('**')) {
    // Handle ** (match any directory depth)
    // ** requires at least one character to match
    const escapedPattern = escapeRegexExceptGlob(normalizedPattern);
    const regexPattern = escapedPattern
      .replace(/\*\*/g, '.+') // .+ requires at least one character
      .replace(/\*/g, '[^/]*') // Single * matches any characters except /
      .replace(/\?/g, '.');
    return new RegExp('^' + regexPattern + '$');
  } else if (normalizedPattern.includes('*') || normalizedPattern.includes('?')) {
    // Handle * (matches within directory) and ? (single character)
    const escapedPattern = escapeRegexExceptGlob(normalizedPattern);
    const regexPattern = escapedPattern
      .replace(/\*/g, '[^/]*') // * matches any characters except /
      .replace(/\?/g, '.');
    return new RegExp('^' + regexPattern + '$');
  } else {
    // Exact match pattern
    return new RegExp('^' + escapeRegexExceptGlob(normalizedPattern) + '$');
  }
}

/**
 * Checks if a path matches any of the given glob patterns
 * @param path - Path to check (will be normalized to forward slashes)
 * @param patterns - Array of glob patterns
 * @param allowPrefix - If true, also match if path starts with pattern (for non-glob patterns)
 * @returns true if path matches any pattern
 */
export function matchesAnyPattern(path: string, patterns: string[], allowPrefix = true): boolean {
  if (patterns.length === 0) {
    return false;
  }

  // Normalize path to use forward slashes
  const normalizedPath = path.replace(/\\/g, '/');

  for (const pattern of patterns) {
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Check if pattern is a glob pattern
    if (normalizedPattern.includes('*') || normalizedPattern.includes('?')) {
      const regex = globToRegex(pattern);
      if (regex.test(normalizedPath)) {
        return true;
      }
    } else {
      // For non-glob patterns, check exact match first
      if (normalizedPath === normalizedPattern) {
        return true;
      }

      // For prefix matching with path boundaries
      if (allowPrefix) {
        // Special case: root pattern "/" should ONLY match "/" exactly
        if (normalizedPattern === '/') {
          continue; // Already checked exact match above, skip prefix matching
        }

        // For patterns ending with "/", they are explicitly prefix patterns
        if (normalizedPattern.endsWith('/')) {
          if (normalizedPath.startsWith(normalizedPattern)) {
            return true;
          }
        } else {
          // For other patterns, match if:
          // 1. Path starts with pattern followed by "/"
          // This ensures "/api" matches "/api/foo" but not "/apitest"
          if (normalizedPath.startsWith(normalizedPattern + '/')) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Checks if a path matches any of the given glob patterns (URL-based)
 * This is a convenience wrapper for URL-based matching
 * @param url - URL to check
 * @param patterns - Array of glob patterns
 * @returns true if URL matches any pattern
 */
export function urlMatchesAnyPattern(url: string, patterns: string[]): boolean {
  return matchesAnyPattern(url, patterns, true);
}

/**
 * Filters an array of items based on include and exclude patterns
 * @param items - Items to filter
 * @param getPath - Function to extract path from item
 * @param options - Filter options
 * @returns Filtered items
 */
export function filterByPatterns<T>(
  items: T[],
  getPath: (item: T) => string,
  options: {
    includePatterns?: string[];
    excludePatterns?: string[];
  } = {},
): T[] {
  let filtered = [...items];

  // Apply include patterns first (if specified)
  if (options.includePatterns && options.includePatterns.length > 0) {
    filtered = filtered.filter((item) =>
      matchesAnyPattern(getPath(item), options.includePatterns!, true),
    );
  }

  // Apply exclude patterns
  if (options.excludePatterns && options.excludePatterns.length > 0) {
    filtered = filtered.filter(
      (item) => !matchesAnyPattern(getPath(item), options.excludePatterns!, true),
    );
  }

  return filtered;
}
