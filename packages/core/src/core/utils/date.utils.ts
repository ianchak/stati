/**
 * Date utilities for reading publish dates from front matter.
 * @module core/utils/date
 */

/**
 * Front matter fields checked for a page's publish date, in priority order.
 * Collections, navigation, ISG aging and RSS all use this order.
 */
export const PUBLISHED_DATE_FIELDS = ['publishedAt', 'published', 'date', 'createdAt'] as const;

/**
 * Returns the publish date from front matter, or `undefined` if none is usable.
 *
 * Checks {@link PUBLISHED_DATE_FIELDS} in order and returns the first valid value.
 * Accepts strings (quoted YAML dates) and `Date` objects (unquoted YAML dates,
 * which YAML parses into `Date`). Missing, `null` and empty values are skipped;
 * other invalid values are reported through `onInvalid` and skipped, so a bad
 * `publishedAt` does not hide a valid `date`.
 *
 * @param frontMatter - Parsed front matter of a page; `null`/`undefined` returns `undefined`
 * @param onInvalid - Called for each present field whose value is not a valid date
 * @returns A new `Date` instance, or `undefined`
 *
 * @example
 * ```typescript
 * getFrontMatterDate({ date: new Date('2026-01-01') }); // 2026-01-01T00:00:00.000Z
 * getFrontMatterDate({ publishedAt: 'soon', date: '2026-06-01' }); // 2026-06-01T00:00:00.000Z
 * getFrontMatterDate({ title: 'Undated' }); // undefined
 * ```
 */
export function getFrontMatterDate(
  frontMatter: Record<string, unknown> | null | undefined,
  onInvalid?: (field: string, value: unknown) => void,
): Date | undefined {
  if (!frontMatter) {
    return undefined;
  }

  for (const field of PUBLISHED_DATE_FIELDS) {
    const value = frontMatter[field];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      continue;
    }

    let date: Date | undefined;
    if (typeof value === 'string') {
      date = new Date(value);
    } else if (value instanceof Date) {
      date = new Date(value.getTime());
    }

    if (date && !isNaN(date.getTime())) {
      return date;
    }

    onInvalid?.(field, value);
  }

  return undefined;
}
