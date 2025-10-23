/**
 * Glob pattern matching utilities for Stati
 * Provides shared glob-to-regex conversion functionality
 * @module core/utils/glob-patterns
 */

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
          } else if (i + 2 === normalizedPattern.length) {
            // ** at end - matches everything
            regexStr += '.*';
            i += 2;
          } else {
            // ** in middle not followed by / - match everything remaining
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
