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

/**
 * Parses a single front matter value into a `Date`, or returns `undefined` when
 * the value is not a usable date.
 *
 * Unlike {@link getFrontMatterDate} this does not walk a field list: it decides
 * about one value. It accepts quoted YAML dates (strings) and unquoted ones
 * (`Date` objects, which YAML parses for it). Numbers, booleans, objects and
 * strings that do not parse to a valid date are rejected, so a value such as
 * `soon` reports `undefined` instead of crashing the caller on `toISOString()`.
 *
 * @param value - A front matter value, anything YAML may produce
 * @returns A new `Date` instance, or `undefined`
 *
 * @example
 * ```typescript
 * parseDateValue('2026-01-01'); // 2026-01-01T00:00:00.000Z
 * parseDateValue(new Date('2026-01-01')); // 2026-01-01T00:00:00.000Z
 * parseDateValue('soon'); // undefined
 * ```
 */
export function parseDateValue(value: unknown): Date | undefined {
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  if (value instanceof Date) {
    const date = new Date(value.getTime());
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

/**
 * Describes a rejected front matter date for a warning without calling the
 * value's own conversion methods, which a YAML mapping such as
 * `{ toString: x }` can break.
 */
export function describeDateValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    return Array.isArray(value) ? 'a list' : 'a mapping';
  }
  return String(value);
}
