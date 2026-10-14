import { describe, it, expect, vi } from 'vitest';
import { getFrontMatterDate, PUBLISHED_DATE_FIELDS } from '../../../src/core/utils/date.utils.js';

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
});
