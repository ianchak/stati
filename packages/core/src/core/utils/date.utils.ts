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
 * The date, and the time if there is one, at the start of a date text: the ISO 8601 shapes
 * {@link parseDateValue} accepts and the YAML timestamps js-yaml reads (`2025-2-3 10:00:00`).
 */
const DATE_TIME_PARTS =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:(?:[Tt]|[ \t]+)(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

/**
 * Whether the date, and the time if there is one, that a text starts with exist: a month from 1
 * to 12, a day the month has, an hour from 0 to 23 (or `24:00:00`, the end of the day) and
 * minutes and seconds from 0 to 59. `new Date` and js-yaml roll a date that doesn't exist over
 * instead of rejecting it: `2025-02-30` becomes 2 March.
 *
 * @param text - A date such as `2025-02-28`, or a date-time such as `2025-02-28T10:00:00Z`
 * @returns False when the text doesn't start with a date, or its date or time doesn't exist
 *
 * @example
 * ```typescript
 * isExistingDateTime('2024-02-29'); // true
 * isExistingDateTime('2025-02-29'); // false
 * isExistingDateTime('2025-01-01T25:00:00Z'); // false
 * ```
 */
export function isExistingDateTime(text: string): boolean {
  const match = DATE_TIME_PARTS.exec(text);
  if (!match) {
    return false;
  }
  const [year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0] = match
    .slice(1)
    .map((part) => Number(part ?? 0));
  // Day 0 of the next month is this month's last day; setUTCFullYear reads years below 100 as
  // written, where Date.UTC would add 1900
  const lastDay = new Date(0);
  lastDay.setUTCFullYear(year, month, 0);
  const endOfDay = hour === 24 && minute === 0 && second === 0;
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= lastDay.getUTCDate() &&
    (hour <= 23 || endOfDay) &&
    minute <= 59 &&
    second <= 59
  );
}

/**
 * Parses a single front matter value into a `Date`, or returns `undefined` when
 * the value is not a usable date.
 *
 * Unlike {@link getFrontMatterDate} this does not walk a field list: it decides
 * about one value. It accepts quoted YAML dates (strings) and unquoted ones
 * (`Date` objects, which YAML parses for it). Strings must be an ISO 8601
 * shape (a date, or a date-time with an optional time and timezone) whose date
 * and time exist ({@link isExistingDateTime}), so `2025-02-30` is rejected
 * instead of read as 2 March; a date-time without a timezone designator is read
 * as UTC, so the result does not depend on the build machine's local time.
 * Numbers, booleans, objects and strings that do not match are rejected, so a
 * value such as `soon` reports `undefined` instead of crashing the caller on
 * `toISOString()`.
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
    if (!ISO_DATE.test(trimmed) || !isExistingDateTime(trimmed)) {
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
