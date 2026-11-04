/**
 * Glob pattern matching utilities for Stati
 * Provides shared glob-to-regex conversion functionality
 * @module core/utils/glob-patterns
 */

import type { Logger } from '../../types/logging.js';

/**
 * Converts a glob pattern to a regular expression.
 * Combines features from both pattern-matching and invalidate implementations.
 *
 * Supports:
 * - `**` - matches zero or more path segments
 * - `*` - matches any characters except path separator
 * - `?` - matches any single character except path separator
 * - `[...]` - character classes
 *
 * @param pattern - Glob pattern to convert (backslashes are normalized to forward slashes)
 * @returns Regular expression that matches the glob pattern
 *
 * @example
 * ```typescript
 * const regex = globToRegex('site/**\/*.md');
 * regex.test('site/blog/post.md'); // true
 * regex.test('site/blog/2024/post.md'); // true
 * ```
 */
export function globToRegex(pattern: string): RegExp {
  // Normalize pattern to use forward slashes for cross-platform compatibility
  const normalizedPattern = pattern.replace(/\\/g, '/');

  let regexStr = '^';
  let i = 0;

  while (i < normalizedPattern.length) {
    const char = normalizedPattern[i];

    switch (char) {
      case '*':
        if (i + 1 < normalizedPattern.length && normalizedPattern[i + 1] === '*') {
          // Handle ** (matches zero or more path segments)
          if (i + 2 < normalizedPattern.length && normalizedPattern[i + 2] === '/') {
            // **/ pattern - matches zero or more directories
            regexStr += '(?:.*/)?';
            i += 3;
          } else {
            // ** at end or in middle not followed by / - match everything remaining
            regexStr += '.*';
            i += 2;
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
        while (closeIndex < normalizedPattern.length && normalizedPattern[closeIndex] !== ']') {
          closeIndex++;
        }

        if (closeIndex >= normalizedPattern.length) {
          // No closing bracket found - invalid pattern
          throw new Error(`Unclosed character class at position ${i}`);
        } else {
          // Valid character class - copy it as-is
          regexStr += normalizedPattern.slice(i, closeIndex + 1);
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
 * Tests if a path matches a glob pattern
 * @param path - Path to test
 * @param pattern - Glob pattern
 * @returns True if path matches pattern
 *
 * @example
 * ```typescript
 * matchesGlob('/blog/post', '/blog/**'); // true
 * matchesGlob('/blog/post', '/news/**'); // false
 * ```
 */
export function matchesGlob(path: string, pattern: string): boolean {
  try {
    const regex = globToRegex(pattern);
    return regex.test(path);
  } catch {
    console.warn(`Invalid glob pattern: ${pattern}`);
    return false;
  }
}

/**
 * Patterns converted by {@link compileUrlPatterns}, by their text, so matching a pattern on
 * every page converts it once. A pattern that is not a valid glob is stored as its error.
 */
const compiledPatterns = new Map<string, RegExp | Error>();
const COMPILED_PATTERNS_MAX_SIZE = 1000;

function compilePattern(pattern: string): RegExp | Error {
  let compiled = compiledPatterns.get(pattern);
  if (compiled === undefined) {
    try {
      compiled = globToRegex(pattern);
    } catch (error) {
      // globToRegex throws only Error, for a character class left open
      compiled = error as Error;
    }
    if (compiledPatterns.size >= COMPILED_PATTERNS_MAX_SIZE) {
      compiledPatterns.clear();
    }
    compiledPatterns.set(pattern, compiled);
  }
  return compiled;
}

/**
 * Options for {@link compileUrlPatterns}.
 */
export interface UrlPatternOptions {
  /**
   * Whether a pattern without `*` or `?` also matches the paths below it: `/blog` matches
   * `/blog` and `/blog/post` but not `/blogroll`, `/blog/` matches every path that starts with
   * it, and `/` matches the root only. Such a pattern is taken as written, so `[` is a plain
   * character in it. Without `prefix`, every pattern is a glob that must match the whole path.
   */
  prefix?: boolean;
  /** The option the patterns come from, named in the warning about an invalid pattern */
  option?: string;
  /** Receives a warning for each pattern that is not a valid glob; without one it is skipped quietly */
  logger?: Pick<Logger, 'warning'> | undefined;
}

/** Tells whether a path matches any of the patterns a matcher was compiled from */
export type UrlPatternMatcher = (path: string) => boolean;

/**
 * Compiles URL or path patterns into one matcher. `**` matches any number of path segments,
 * `*` and `?` stay within one segment, and `[...]` is a character class. Backslashes in
 * patterns and paths count as `/`.
 *
 * A pattern that is not a valid glob, such as `/blog/[draft` with its class left open, never
 * matches: it is reported to `logger` as a warning that names `option` and skipped, so one typo
 * leaves the rest of the patterns working. Compile once per build and match every page with
 * the result; the conversion of each pattern is also cached by its text.
 *
 * @param patterns - Glob patterns; none (or `undefined`) gives a matcher that matches nothing
 * @param options - The matching rule and where to report invalid patterns
 * @returns A function that tells whether a path matches any of the patterns
 *
 * @example
 * ```typescript
 * const isExcluded = compileUrlPatterns(['/drafts/**'], { option: 'search.exclude', logger });
 * isExcluded('/drafts/idea'); // true
 * compileUrlPatterns(['/blog'], { prefix: true })('/blog/post'); // true
 * compileUrlPatterns(['/blog'])('/blog/post'); // false
 * ```
 */
export function compileUrlPatterns(
  patterns: readonly string[] | undefined,
  options: UrlPatternOptions = {},
): UrlPatternMatcher {
  const { prefix = false, option, logger } = options;
  const tests: UrlPatternMatcher[] = [];

  for (const pattern of patterns ?? []) {
    const normalizedPattern = pattern.replace(/\\/g, '/');

    if (prefix && !normalizedPattern.includes('*') && !normalizedPattern.includes('?')) {
      if (normalizedPattern === '/') {
        tests.push((path) => path === '/');
      } else if (normalizedPattern.endsWith('/')) {
        tests.push((path) => path.startsWith(normalizedPattern));
      } else {
        tests.push(
          (path) => path === normalizedPattern || path.startsWith(`${normalizedPattern}/`),
        );
      }
      continue;
    }

    const compiled = compilePattern(normalizedPattern);
    if (compiled instanceof Error) {
      logger?.warning(
        `Ignoring invalid pattern "${pattern}"${option ? ` in ${option}` : ''}: ${compiled.message}`,
      );
      continue;
    }
    tests.push((path) => compiled.test(path));
  }

  return (path) => {
    const normalizedPath = path.replace(/\\/g, '/');
    return tests.some((test) => test(normalizedPath));
  };
}
