/**
 * Pattern matching utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
  matchesAnyPattern,
  urlMatchesAnyPattern,
  filterByPatterns,
} from '../../src/rss/utils/index.js';
import type { PageModel } from '../../src/types/content.js';

describe('Pattern Matching Utilities', () => {
  describe('matchesAnyPattern', () => {
    it('should match exact paths', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site/blog/post.md'])).toBe(true);
      expect(matchesAnyPattern('site/blog/post.md', ['site/other/post.md'])).toBe(false);
    });

    it('should match single wildcard (*)', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site/*/post.md'])).toBe(true);
      expect(matchesAnyPattern('site/blog/news/post.md', ['site/*/post.md'])).toBe(false);
    });

    it('should match patterns with trailing slashes', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site/blog/'])).toBe(true);
      expect(matchesAnyPattern('site/blog/news/post.md', ['site/blog/'])).toBe(true);
    });

    it('should return false for empty pattern array', () => {
      expect(matchesAnyPattern('site/blog/post.md', [])).toBe(false);
    });

    it('should handle Windows-style paths', () => {
      expect(matchesAnyPattern('site\\blog\\post.md', ['site/blog/**'])).toBe(true);
      expect(matchesAnyPattern('site/blog/post.md', ['site\\blog\\**'])).toBe(true);
    });
  });

  describe('urlMatchesAnyPattern', () => {
    it('should match exact URLs', () => {
      expect(urlMatchesAnyPattern('/blog/post', ['/blog/post'])).toBe(true);
      expect(urlMatchesAnyPattern('/blog/post', ['/other/post'])).toBe(false);
    });

    it('should match URL patterns with wildcards', () => {
      expect(urlMatchesAnyPattern('/blog/post-1', ['/blog/*'])).toBe(true);
      expect(urlMatchesAnyPattern('/blog/category/post', ['/blog/**'])).toBe(true); // ** matches multiple path segments
      expect(urlMatchesAnyPattern('/docs/guide', ['/blog/**'])).toBe(false);
    });

    it('should match multiple URL patterns', () => {
      const patterns = ['/blog/**', '/news/**'];

      expect(urlMatchesAnyPattern('/blog/post', patterns)).toBe(true);
      expect(urlMatchesAnyPattern('/news/article', patterns)).toBe(true);
      expect(urlMatchesAnyPattern('/docs/page', patterns)).toBe(false);
    });

    it('should handle trailing slashes in URLs', () => {
      expect(urlMatchesAnyPattern('/blog/post/', ['/blog'])).toBe(true); // allowPrefix matches
      expect(urlMatchesAnyPattern('/blog/post', ['/blog/'])).toBe(true); // allowPrefix matches
    });

    it('should return false for empty pattern array', () => {
      expect(urlMatchesAnyPattern('/blog/post', [])).toBe(false);
    });
  });

  describe('filterByPatterns', () => {
    const samplePages: PageModel[] = [
      {
        slug: 'post-1',
        url: '/blog/post-1',
        content: 'Content 1',
        frontMatter: { title: 'Post 1' },
        sourcePath: 'site/blog/post-1.md',
      },
      {
        slug: 'post-2',
        url: '/blog/post-2',
        content: 'Content 2',
        frontMatter: { title: 'Post 2' },
        sourcePath: 'site/blog/post-2.md',
      },
      {
        slug: 'article',
        url: '/news/article',
        content: 'News content',
        frontMatter: { title: 'Article' },
        sourcePath: 'site/news/article.md',
      },
      {
        slug: 'about',
        url: '/about',
        content: 'About content',
        frontMatter: { title: 'About' },
        sourcePath: 'site/about.md',
      },
    ] as PageModel[];

    it('should return all items when no patterns specified', () => {
      const result = filterByPatterns(samplePages, (page) => page.sourcePath, {});

      expect(result).toHaveLength(4);
    });

    it('should filter by include patterns', () => {
      const result = filterByPatterns(samplePages, (page) => page.sourcePath, {
        includePatterns: ['site/blog/**'],
      });

      expect(result).toHaveLength(2);
      expect(result.every((page) => page.url.startsWith('/blog'))).toBe(true);
    });

    it('should filter by exclude patterns', () => {
      const result = filterByPatterns(samplePages, (page) => page.sourcePath, {
        excludePatterns: ['**/about.md'],
      });

      expect(result).toHaveLength(3);
      expect(result.find((page) => page.slug === 'about')).toBeUndefined();
    });

    it('should apply both include and exclude patterns', () => {
      const result = filterByPatterns(samplePages, (page) => page.sourcePath, {
        includePatterns: ['site/blog/**', 'site/news/**'],
        excludePatterns: ['site/blog/post-2.md'],
      });

      expect(result).toHaveLength(2);
      expect(result.find((page) => page.slug === 'post-1')).toBeDefined();
      expect(result.find((page) => page.slug === 'article')).toBeDefined();
      expect(result.find((page) => page.slug === 'post-2')).toBeUndefined();
    });

    it('should handle multiple include patterns', () => {
      const result = filterByPatterns(samplePages, (page) => page.sourcePath, {
        includePatterns: ['site/blog/**', 'site/news/**'],
      });

      expect(result).toHaveLength(3);
      expect(result.find((page) => page.slug === 'about')).toBeUndefined();
    });

    it('should handle multiple exclude patterns', () => {
      const result = filterByPatterns(samplePages, (page) => page.sourcePath, {
        excludePatterns: ['site/blog/post-1.md', 'site/news/article.md'],
      });

      expect(result).toHaveLength(2);
      expect(result.find((page) => page.slug === 'post-1')).toBeUndefined();
      expect(result.find((page) => page.slug === 'article')).toBeUndefined();
    });

    it('should work with custom property accessor', () => {
      const result = filterByPatterns(samplePages, (page) => page.url, {
        includePatterns: ['/blog/**'],
      });

      expect(result).toHaveLength(2);
      expect(result.every((page) => page.url.startsWith('/blog'))).toBe(true);
    });

    it('should handle empty arrays', () => {
      const result = filterByPatterns<PageModel>([], (page) => page.sourcePath, {
        includePatterns: ['site/blog/**'],
      });

      expect(result).toHaveLength(0);
    });

    it('should prioritize exclude patterns over include patterns', () => {
      const result = filterByPatterns(samplePages, (page) => page.sourcePath, {
        includePatterns: ['site'],
        excludePatterns: ['site/blog'],
      });

      expect(result).toHaveLength(2);
      expect(result.find((page) => page.slug === 'article')).toBeDefined();
      expect(result.find((page) => page.slug === 'about')).toBeDefined();
      expect(result.find((page) => page.slug === 'post-1')).toBeUndefined();
    });
  });

  describe('Edge Cases and Additional Coverage', () => {
    it('should handle exact match of root pattern /', () => {
      expect(matchesAnyPattern('/', ['/'])).toBe(true);
      expect(matchesAnyPattern('/blog', ['/'])).toBe(false); // Should not match prefix
    });

    it('should handle double asterisk matching zero or more directories', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site/**/post.md'])).toBe(true);
      expect(matchesAnyPattern('site/post.md', ['site/**/post.md'])).toBe(true); // ** matches zero directories (standard glob behavior)
      expect(matchesAnyPattern('site/blog/category/post.md', ['site/**/post.md'])).toBe(true);
    });

    it('should handle question mark wildcard', () => {
      expect(matchesAnyPattern('site/blog/p.md', ['site/blog/?.md'])).toBe(true);
      expect(matchesAnyPattern('site/blog/post.md', ['site/blog/?.md'])).toBe(false);
    });

    it('should handle patterns with special regex characters', () => {
      expect(matchesAnyPattern('site/[test].md', ['site/[test].md'])).toBe(true);
      expect(matchesAnyPattern('site/(test).md', ['site/(test).md'])).toBe(true);
      expect(matchesAnyPattern('site/test+file.md', ['site/test+file.md'])).toBe(true);
    });

    it('should handle prefix matching with boundary check', () => {
      expect(matchesAnyPattern('/api/foo', ['/api'])).toBe(true);
      expect(matchesAnyPattern('/apitest', ['/api'])).toBe(false); // Should not match without boundary
    });

    it('should handle patterns ending with slash as prefix patterns', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site/blog/'])).toBe(true);
      expect(matchesAnyPattern('site/news/article.md', ['site/blog/'])).toBe(false);
    });

    it('should not allow prefix matching when allowPrefix is false', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site/blog'], false)).toBe(false);
      expect(matchesAnyPattern('site/blog', ['site/blog'], false)).toBe(true); // Exact match still works
    });

    it('should handle mixed glob and non-glob patterns', () => {
      const patterns = ['site/exact.md', 'site/blog/**', 'site/news/*.md'];
      expect(matchesAnyPattern('site/exact.md', patterns)).toBe(true);
      expect(matchesAnyPattern('site/blog/deep/post.md', patterns)).toBe(true);
      expect(matchesAnyPattern('site/news/article.md', patterns)).toBe(true);
      expect(matchesAnyPattern('site/other/file.md', patterns)).toBe(false);
    });

    it('should handle single asterisk not matching slashes', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site/*/post.md'])).toBe(true);
      expect(matchesAnyPattern('site/blog/category/post.md', ['site/*/post.md'])).toBe(false);
    });

    it('should handle multiple question marks', () => {
      expect(matchesAnyPattern('site/ab.md', ['site/??.md'])).toBe(true);
      expect(matchesAnyPattern('site/abc.md', ['site/??.md'])).toBe(false);
    });

    it('should handle backslash normalization in patterns', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site\\blog\\**'])).toBe(true);
      expect(matchesAnyPattern('site\\blog\\post.md', ['site/blog/**'])).toBe(true);
    });

    it('should handle **/ at beginning of pattern', () => {
      expect(matchesAnyPattern('post.md', ['**/post.md'])).toBe(true);
      expect(matchesAnyPattern('blog/post.md', ['**/post.md'])).toBe(true);
      expect(matchesAnyPattern('blog/2024/post.md', ['**/post.md'])).toBe(true);
    });

    it('should handle ** at end of pattern', () => {
      expect(matchesAnyPattern('site/blog/post.md', ['site/blog/**'])).toBe(true);
      expect(matchesAnyPattern('site/blog/category/post.md', ['site/blog/**'])).toBe(true);
      expect(matchesAnyPattern('site/news/post.md', ['site/blog/**'])).toBe(false);
    });

    it('should handle multiple ** in pattern', () => {
      expect(matchesAnyPattern('a/b/c/d/e.md', ['a/**/c/**/e.md'])).toBe(true);
      expect(matchesAnyPattern('a/c/e.md', ['a/**/c/**/e.md'])).toBe(true);
      expect(matchesAnyPattern('a/x/y/c/z/e.md', ['a/**/c/**/e.md'])).toBe(true);
    });

    it('should handle ** without slashes', () => {
      expect(matchesAnyPattern('site/anything/here.md', ['site/**here.md'])).toBe(true);
      expect(matchesAnyPattern('site/here.md', ['site/**here.md'])).toBe(true);
    });

    it('should differentiate between * and **', () => {
      // * should not match across directories
      expect(matchesAnyPattern('site/blog/post.md', ['site/*/post.md'])).toBe(true);
      expect(matchesAnyPattern('site/blog/category/post.md', ['site/*/post.md'])).toBe(false);

      // ** should match across directories
      expect(matchesAnyPattern('site/blog/post.md', ['site/**/post.md'])).toBe(true);
      expect(matchesAnyPattern('site/blog/category/post.md', ['site/**/post.md'])).toBe(true);
    });
  });
});
