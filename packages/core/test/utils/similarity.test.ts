import { describe, it, expect } from 'vitest';
import { editDistance, findSimilarNames } from '../../src/core/utils/similarity.utils.js';

describe('similarity utils', () => {
  describe('editDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(editDistance('page', 'page')).toBe(0);
    });

    it('counts insertions, deletions, and substitutions', () => {
      expect(editDistance('her', 'hero')).toBe(1);
      expect(editDistance('header', 'head')).toBe(2);
      expect(editDistance('site', 'sute')).toBe(1);
      expect(editDistance('', 'nav')).toBe(3);
    });

    it('counts an adjacent transposition as one edit', () => {
      expect(editDistance('paeg', 'page')).toBe(1);
      expect(editDistance('titel', 'title')).toBe(1);
    });
  });

  describe('findSimilarNames', () => {
    it('suggests close misspellings', () => {
      expect(findSimilarNames('paeg', ['page', 'partials', 'site', 'nav'])).toEqual(['page']);
      expect(findSimilarNames('fromatDate', ['formatDate', 'isoDate'])).toEqual(['formatDate']);
    });

    it('suggests names that share a prefix of at least 3 characters', () => {
      expect(findSimilarNames('head', ['header', 'hero', 'footer'])).toEqual(['header']);
      expect(findSimilarNames('getBreadcrumb', ['getBreadcrumbs', 'getChildren'])).toEqual([
        'getBreadcrumbs',
      ]);
    });

    it('ignores case when comparing', () => {
      expect(findSimilarNames('Page', ['page', 'site'])).toEqual(['page']);
    });

    it('returns nothing when no candidate is close', () => {
      expect(findSimilarNames('xyz', ['hero', 'footer'])).toEqual([]);
      expect(findSimilarNames('anything', [])).toEqual([]);
    });

    it('orders by distance and respects the limit', () => {
      const result = findSimilarNames('cart', ['card', 'cards', 'carts', 'cat', 'part'], 2);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('carts');
    });
  });
});
