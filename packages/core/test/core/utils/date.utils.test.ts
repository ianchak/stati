import { describe, it, expect, vi } from 'vitest';
import {
  getFrontMatterDate,
  PUBLISHED_DATE_FIELDS,
  parseDateValue,
} from '../../../src/core/utils/date.utils.js';

describe('date.utils', () => {
  describe('PUBLISHED_DATE_FIELDS', () => {
    it('lists the publish date fields in priority order', () => {
      expect(PUBLISHED_DATE_FIELDS).toEqual(['publishedAt', 'published', 'date', 'createdAt']);
    });
  });

  describe('getFrontMatterDate', () => {
    it('parses a quoted (string) date', () => {
      expect(getFrontMatterDate({ publishedAt: '2026-01-01' })).toEqual(new Date('2026-01-01'));
    });

    it('accepts an unquoted YAML date (Date object)', () => {
      expect(getFrontMatterDate({ publishedAt: new Date('2026-01-01') })).toEqual(
        new Date('2026-01-01'),
      );
    });

    it.each(['published', 'date', 'createdAt'])('reads the %s field', (field) => {
      expect(getFrontMatterDate({ [field]: '2026-06-01' })).toEqual(new Date('2026-06-01'));
    });

    it('prefers fields earlier in the priority order', () => {
      const frontMatter = {
        createdAt: '2026-04-01',
        date: '2026-03-01',
        published: '2026-02-01',
        publishedAt: '2026-01-01',
      };
      expect(getFrontMatterDate(frontMatter)).toEqual(new Date('2026-01-01'));
    });

    it('falls through an invalid value to the next field and reports it', () => {
      const onInvalid = vi.fn();
      const result = getFrontMatterDate({ publishedAt: 'soon', date: '2026-06-01' }, onInvalid);

      expect(result).toEqual(new Date('2026-06-01'));
      expect(onInvalid).toHaveBeenCalledOnce();
      expect(onInvalid).toHaveBeenCalledWith('publishedAt', 'soon');
    });

    it('rejects an invalid Date object', () => {
      const onInvalid = vi.fn();
      expect(getFrontMatterDate({ date: new Date('nope') }, onInvalid)).toBeUndefined();
      expect(onInvalid).toHaveBeenCalledWith('date', expect.any(Date));
    });

    it('rejects values that are neither strings nor Dates', () => {
      const onInvalid = vi.fn();
      expect(
        getFrontMatterDate({ publishedAt: 1700000000, date: true }, onInvalid),
      ).toBeUndefined();
      expect(onInvalid).toHaveBeenCalledTimes(2);
    });

    it('skips missing, null and empty values without reporting them', () => {
      const onInvalid = vi.fn();
      expect(
        getFrontMatterDate({ publishedAt: null, published: '', date: '   ' }, onInvalid),
      ).toBeUndefined();
      expect(onInvalid).not.toHaveBeenCalled();
    });

    it('returns undefined when there is no date', () => {
      expect(getFrontMatterDate({ title: 'Undated' })).toBeUndefined();
      expect(getFrontMatterDate(null)).toBeUndefined();
      expect(getFrontMatterDate(undefined)).toBeUndefined();
    });

    it('returns a copy, not the front matter Date itself', () => {
      const original = new Date('2026-01-01');
      const result = getFrontMatterDate({ publishedAt: original });

      expect(result).not.toBe(original);
      result!.setFullYear(2000);
      expect(original.getFullYear()).toBe(2026);
    });
  });

  describe('parseDateValue', () => {
    it('parses a quoted (string) date', () => {
      expect(parseDateValue('2026-01-01')).toEqual(new Date('2026-01-01'));
    });

    it('accepts a Date object (unquoted YAML date)', () => {
      expect(parseDateValue(new Date('2026-06-01'))).toEqual(new Date('2026-06-01'));
    });

    it('returns undefined for a value that is not a date', () => {
      expect(parseDateValue('soon')).toBeUndefined();
      expect(parseDateValue('next week')).toBeUndefined();
      expect(parseDateValue(1700000000)).toBeUndefined();
      expect(parseDateValue(true)).toBeUndefined();
      expect(parseDateValue({ toString: () => '2026-01-01' })).toBeUndefined();
      expect(parseDateValue(null)).toBeUndefined();
      expect(parseDateValue(undefined)).toBeUndefined();
    });

    it('rejects loose V8 date strings that are not ISO 8601 shapes', () => {
      // `new Date` happily turns these into dates (V8); they must not pass.
      expect(parseDateValue('tbd 2025')).toBeUndefined();
      expect(parseDateValue('draft 3')).toBeUndefined();
      expect(parseDateValue('March 5')).toBeUndefined();
      expect(parseDateValue('March 5, 2025')).toBeUndefined();
      expect(parseDateValue('invalid-date-format')).toBeUndefined();
      expect(parseDateValue('not-a-date')).toBeUndefined();
    });

    it('accepts ISO 8601 date and date-time shapes', () => {
      expect(parseDateValue('2025-03-05')).toEqual(new Date('2025-03-05'));
      expect(parseDateValue('2025-03-05T10:20')).toEqual(new Date('2025-03-05T10:20:00.000Z'));
      expect(parseDateValue('2025-03-05T10:20:30Z')).toEqual(new Date('2025-03-05T10:20:30Z'));
      expect(parseDateValue('2025-03-05 10:20:30+02:00')).toEqual(
        new Date('2025-03-05T08:20:30.000Z'),
      );
      expect(parseDateValue('2025-03-05T10:20:30.5Z')).toEqual(new Date('2025-03-05T10:20:30.5Z'));
    });

    it('reads a date-time without a timezone designator as UTC, independent of local time', () => {
      process.env.TZ = 'Europe/Budapest';
      expect(parseDateValue('2025-03-05T10:20')?.toISOString()).toBe('2025-03-05T10:20:00.000Z');
      process.env.TZ = 'Pacific/Kiritimati';
      expect(parseDateValue('2025-03-05 10:20:30')?.toISOString()).toBe('2025-03-05T10:20:30.000Z');
      delete process.env.TZ;
    });

    it('reports a rejected non-ISO string through onInvalid in getFrontMatterDate', () => {
      const onInvalid = vi.fn();
      const result = getFrontMatterDate(
        { publishedAt: 'March 5, 2025', date: '2026-06-01' },
        onInvalid,
      );
      expect(result).toEqual(new Date('2026-06-01'));
      expect(onInvalid).toHaveBeenCalledWith('publishedAt', 'March 5, 2025');
    });

    it('returns a copy, not the input Date itself', () => {
      const original = new Date('2026-01-01');
      const result = parseDateValue(original);

      expect(result).not.toBe(original);
      result!.setFullYear(2000);
      expect(original.getFullYear()).toBe(2026);
    });
  });
});
