/**
 * Date utilities for reading publish and modified dates from front matter.
 * @module core/utils/date
 */

import type { PageModel } from '../../types/content.js';

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

  return firstValidDate(
    PUBLISHED_DATE_FIELDS.map((field) => [field, frontMatter[field]]),
    onInvalid,
  );
}

/**
 * Returns the first value that is a valid date, in order. Missing, `null` and empty values are
 * skipped; other invalid values are reported through `onInvalid` and skipped.
 */
function firstValidDate(
  sources: ReadonlyArray<readonly [string, unknown]>,
  onInvalid?: (field: string, value: unknown) => void,
): Date | undefined {
  for (const [field, value] of sources) {
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      continue;
    }

    // Strings and Date objects are both decided by parseDateValue; anything
    // else (numbers, booleans, objects) is reported through onInvalid below.
    const date = parseDateValue(value);

    if (date) {
      return date;
    }

    onInvalid?.(field, value);
  }

  return undefined;
}

/**
 * Returns the page's publish date: `page.publishedAt`, which Stati works out from
 * {@link PUBLISHED_DATE_FIELDS} when it loads the page. A page without a valid one, such as a
 * page a `beforeAll` hook adds or a page built by hand for a generator, gets the first valid of
 * those fields in its front matter, read with {@link getFrontMatterDate}.
 *
 * @param page - The page
 * @param onInvalid - Called for each present front matter field whose value is not a valid
 *   date, when the front matter is read
 * @returns A new `Date` instance, or `undefined` when the page has no valid date
 */
export function getPagePublishedDate(
  page: PageModel,
  onInvalid?: (field: string, value: unknown) => void,
): Date | undefined {
  return parseDateValue(page.publishedAt) ?? getFrontMatterDate(page.frontMatter, onInvalid);
}

/**
 * Returns when the page last changed: the first valid of front matter `sitemap.lastmod` and
 * `updated`, then the page's publish date ({@link getPagePublishedDate}).
 *
 * Missing, `null` and empty values are skipped; other invalid values are reported through
 * `onInvalid` and skipped, so a bad `updated` does not hide a valid publish date.
 *
 * @param page - The page
 * @param onInvalid - Called for each present field whose value is not a valid date
 * @returns A new `Date` instance, or `undefined` when the page has no valid date
 *
 * @example
 * ```typescript
 * const publishedAt = new Date('2026-01-01');
 * getPageModifiedDate({ ...page, publishedAt, frontMatter: { updated: '2026-02-01' } });
 * // 2026-02-01T00:00:00.000Z
 * getPageModifiedDate({ ...page, publishedAt, frontMatter: { updated: 'soon' } });
 * // 2026-01-01T00:00:00.000Z, after onInvalid('updated', 'soon')
 * ```
 */
export function getPageModifiedDate(
  page: PageModel,
  onInvalid?: (field: string, value: unknown) => void,
): Date | undefined {
  return (
    firstValidDate(
      [
        ['sitemap.lastmod', page.frontMatter.sitemap?.lastmod],
        ['updated', page.frontMatter.updated],
      ],
      onInvalid,
    ) ?? getPagePublishedDate(page, onInvalid)
  );
}

/**
 * ISO 8601 date shapes accepted from front matter: a date (`2025-03-05`) or a
 * date-time with an optional time, seconds, fractional seconds and timezone
 * designator. Anything else (e.g. `"tbd 2025"`) is rejected instead of letting
 * `new Date` make something up of it.
 */
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Parses a single front matter value into a `Date`, or returns `undefined` when
 * the value is not a usable date.
 *
 * Unlike {@link getFrontMatterDate} this does not walk a field list: it decides
 * about one value. It accepts quoted YAML dates (strings) and unquoted ones
 * (`Date` objects, which YAML parses for it). Strings must be an ISO 8601
 * shape (a date, or a date-time with an optional time and timezone); a
 * date-time without a timezone designator is read as UTC, so the result does
 * not depend on the build machine's local time. Numbers, booleans, objects and
 * strings that do not match are rejected, so a value such as `soon` reports
 * `undefined` instead of crashing the caller on `toISOString()`.
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
    const trimmed = value.trim();
    if (!ISO_DATE.test(trimmed)) {
      return undefined;
    }
    const hasTime = /[T ]\d{2}:\d{2}/.test(trimmed);
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(trimmed);
    const normalized = hasTime && !hasZone ? `${trimmed}Z` : trimmed;
    const date = new Date(normalized);
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
