import { describe, it, expect, vi } from 'vitest';
import { globToRegex, matchesGlob } from '../../src/core/utils/glob-patterns.js';

describe('Glob Pattern Utilities', () => {
  describe('globToRegex', () => {
    describe('basic wildcard patterns', () => {
      it('should convert single asterisk to match any characters except slash', () => {
        const regex = globToRegex('/blog/*.md');
        expect(regex.test('/blog/post.md')).toBe(true);
        expect(regex.test('/blog/post-2.md')).toBe(true);
        expect(regex.test('/blog/nested/post.md')).toBe(false);
      });

      it('should convert double asterisk to match zero or more path segments', () => {
        const regex = globToRegex('/blog/**/*.md');
        expect(regex.test('/blog/post.md')).toBe(true);
        expect(regex.test('/blog/2024/post.md')).toBe(true);
        expect(regex.test('/blog/2024/01/post.md')).toBe(true);
        expect(regex.test('/news/post.md')).toBe(false);
      });

      it('should handle double asterisk at the end', () => {
        const regex = globToRegex('/blog/**');
        expect(regex.test('/blog/post.md')).toBe(true);
        expect(regex.test('/blog/2024/post.md')).toBe(true);
        expect(regex.test('/blog')).toBe(false);
      });

      it('should handle question mark as single character wildcard', () => {
        const regex = globToRegex('/blog/post-?.md');
        expect(regex.test('/blog/post-1.md')).toBe(true);
        expect(regex.test('/blog/post-a.md')).toBe(true);
        expect(regex.test('/blog/post-12.md')).toBe(false);
        expect(regex.test('/blog/post-.md')).toBe(false);
      });
    });

    describe('character classes', () => {
      it('should support character classes', () => {
        const regex = globToRegex('/blog/post-[123].md');
        expect(regex.test('/blog/post-1.md')).toBe(true);
        expect(regex.test('/blog/post-2.md')).toBe(true);
        expect(regex.test('/blog/post-3.md')).toBe(true);
        expect(regex.test('/blog/post-4.md')).toBe(false);
      });

      it('should support character ranges', () => {
        const regex = globToRegex('/blog/post-[a-z].md');
        expect(regex.test('/blog/post-a.md')).toBe(true);
        expect(regex.test('/blog/post-m.md')).toBe(true);
        expect(regex.test('/blog/post-z.md')).toBe(true);
        expect(regex.test('/blog/post-1.md')).toBe(false);
      });

      it('should throw error on unclosed character class', () => {
        expect(() => globToRegex('/blog/post-[abc.md')).toThrow('Unclosed character class');
      });
    });

    describe('path normalization', () => {
      it('should normalize backslashes to forward slashes', () => {
        const regex = globToRegex('\\blog\\**\\*.md');
        expect(regex.test('/blog/post.md')).toBe(true);
        expect(regex.test('/blog/2024/post.md')).toBe(true);
      });

      it('should handle mixed path separators', () => {
        const regex = globToRegex('\\blog/2024\\*.md');
        expect(regex.test('/blog/2024/post.md')).toBe(true);
      });
    });

    describe('special characters escaping', () => {
      it('should escape regex special characters', () => {
        const regex = globToRegex('/api/v1.0/*.json');
        expect(regex.test('/api/v1.0/data.json')).toBe(true);
        expect(regex.test('/api/v1X0/data.json')).toBe(false);
      });

      it('should escape parentheses', () => {
        const regex = globToRegex('/data(test)/*.json');
        expect(regex.test('/data(test)/file.json')).toBe(true);
        expect(regex.test('/datatest/file.json')).toBe(false);
      });

      it('should escape dollar sign', () => {
        const regex = globToRegex('/$config/*.json');
        expect(regex.test('/$config/settings.json')).toBe(true);
      });

      it('should escape caret', () => {
        const regex = globToRegex('/^temp/*.txt');
        expect(regex.test('/^temp/file.txt')).toBe(true);
      });
    });

    describe('blog-specific patterns', () => {
      it('should match blog post paths', () => {
        const regex = globToRegex('/blog/**');
        expect(regex.test('/blog/my-first-post')).toBe(true);
        expect(regex.test('/blog/2024/january/post')).toBe(true);
        expect(regex.test('/blog/category/tech/post')).toBe(true);
      });

      it('should match blog posts by year', () => {
        const regex = globToRegex('/blog/2024/**');
        expect(regex.test('/blog/2024/post.md')).toBe(true);
        expect(regex.test('/blog/2024/01/post.md')).toBe(true);
        expect(regex.test('/blog/2023/post.md')).toBe(false);
      });

      it('should match blog posts by category', () => {
        const regex = globToRegex('/blog/category/tech/**');
        expect(regex.test('/blog/category/tech/post1.md')).toBe(true);
        expect(regex.test('/blog/category/tech/2024/post1.md')).toBe(true);
        expect(regex.test('/blog/category/news/post1.md')).toBe(false);
      });

      it('should match markdown files only', () => {
        const regex = globToRegex('/blog/**/*.md');
        expect(regex.test('/blog/post.md')).toBe(true);
        expect(regex.test('/blog/2024/post.md')).toBe(true);
        expect(regex.test('/blog/post.html')).toBe(false);
        expect(regex.test('/blog/post.txt')).toBe(false);
      });

      it('should match specific file patterns', () => {
        const regex = globToRegex('/blog/**/index.md');
        expect(regex.test('/blog/index.md')).toBe(true);
        expect(regex.test('/blog/category/index.md')).toBe(true);
        expect(regex.test('/blog/post.md')).toBe(false);
      });

      it('should match author-specific posts', () => {
        const regex = globToRegex('/blog/author/john-*/**');
        expect(regex.test('/blog/author/john-smith/post.md')).toBe(true);
        expect(regex.test('/blog/author/john-doe/2024/post.md')).toBe(true);
        expect(regex.test('/blog/author/jane-smith/post.md')).toBe(false);
      });

      it('should match draft posts', () => {
        const regex = globToRegex('/blog/**/draft-*.md');
        expect(regex.test('/blog/draft-new-post.md')).toBe(true);
        expect(regex.test('/blog/2024/draft-article.md')).toBe(true);
        expect(regex.test('/blog/published-post.md')).toBe(false);
      });

      it('should match posts with numeric patterns', () => {
        const regex = globToRegex('/blog/202[0-9]/**');
        expect(regex.test('/blog/2020/post.md')).toBe(true);
        expect(regex.test('/blog/2024/post.md')).toBe(true);
        expect(regex.test('/blog/2029/post.md')).toBe(true);
        expect(regex.test('/blog/2030/post.md')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle empty pattern', () => {
        const regex = globToRegex('');
        expect(regex.test('')).toBe(true);
        expect(regex.test('/blog')).toBe(false);
      });

      it('should handle pattern with only asterisks', () => {
        const regex = globToRegex('**');
        expect(regex.test('/blog/post')).toBe(true);
        expect(regex.test('anything')).toBe(true);
      });

      it('should handle pattern without wildcards', () => {
        const regex = globToRegex('/blog/specific-post.md');
        expect(regex.test('/blog/specific-post.md')).toBe(true);
        expect(regex.test('/blog/other-post.md')).toBe(false);
      });

      it('should handle consecutive asterisks in middle', () => {
        const regex = globToRegex('/blog/**/2024/**/*.md');
        expect(regex.test('/blog/2024/post.md')).toBe(true);
        expect(regex.test('/blog/category/2024/post.md')).toBe(true);
        expect(regex.test('/blog/category/2024/01/post.md')).toBe(true);
      });

      it('should handle single asterisk between paths', () => {
        const regex = globToRegex('/blog/*/post.md');
        expect(regex.test('/blog/2024/post.md')).toBe(true);
        expect(regex.test('/blog/tech/post.md')).toBe(true);
        expect(regex.test('/blog/2024/01/post.md')).toBe(false);
      });
    });

    describe('real-world blog scenarios', () => {
      it('should match RSS feed invalidation pattern', () => {
        const regex = globToRegex('/blog/**');
        expect(regex.test('/blog/index.html')).toBe(true);
        expect(regex.test('/blog/post-1.html')).toBe(true);
        expect(regex.test('/blog/category/tech/post.html')).toBe(true);
      });

      it('should match sitemap patterns', () => {
        const regex = globToRegex('/**/*.html');
        expect(regex.test('/index.html')).toBe(true);
        expect(regex.test('/blog/post.html')).toBe(true);
        expect(regex.test('/about/team.html')).toBe(true);
      });

      it('should match tag-based patterns', () => {
        const regex = globToRegex('/tags/**/*.html');
        expect(regex.test('/tags/javascript/post.html')).toBe(true);
        expect(regex.test('/tags/javascript/page-2.html')).toBe(true);
        expect(regex.test('/blog/post.html')).toBe(false);
      });

      it('should match pagination patterns', () => {
        const regex = globToRegex('/blog/page-[0-9]*.html');
        expect(regex.test('/blog/page-1.html')).toBe(true);
        expect(regex.test('/blog/page-2.html')).toBe(true);
        expect(regex.test('/blog/page-10.html')).toBe(true);
        expect(regex.test('/blog/index.html')).toBe(false);
      });
    });
  });

  describe('matchesGlob', () => {
    describe('basic matching', () => {
      it('should return true for matching paths', () => {
        expect(matchesGlob('/blog/post.md', '/blog/**')).toBe(true);
        expect(matchesGlob('/blog/2024/post.md', '/blog/**/*.md')).toBe(true);
      });

      it('should return false for non-matching paths', () => {
        expect(matchesGlob('/news/post.md', '/blog/**')).toBe(false);
        expect(matchesGlob('/blog/post.txt', '/blog/**/*.md')).toBe(false);
      });
    });

    describe('blog-specific matching', () => {
      it('should match blog root paths', () => {
        expect(matchesGlob('/blog/index.html', '/blog/**')).toBe(true);
        expect(matchesGlob('/blog/post-1.html', '/blog/**')).toBe(true);
      });

      it('should match nested blog paths', () => {
        expect(matchesGlob('/blog/category/tech/post.html', '/blog/**')).toBe(true);
        expect(matchesGlob('/blog/2024/01/post.html', '/blog/**')).toBe(true);
      });

      it('should not match other sections', () => {
        expect(matchesGlob('/news/article.html', '/blog/**')).toBe(false);
        expect(matchesGlob('/about/index.html', '/blog/**')).toBe(false);
      });

      it('should match year-specific patterns', () => {
        expect(matchesGlob('/blog/2024/post.html', '/blog/2024/**')).toBe(true);
        expect(matchesGlob('/blog/2023/post.html', '/blog/2024/**')).toBe(false);
      });

      it('should match file extension patterns', () => {
        expect(matchesGlob('/blog/post.md', '/blog/**/*.md')).toBe(true);
        expect(matchesGlob('/blog/post.html', '/blog/**/*.md')).toBe(false);
      });
    });

    describe('Windows path handling', () => {
      it('should normalize Windows paths in patterns', () => {
        expect(matchesGlob('/blog/post.md', '\\blog\\**\\*.md')).toBe(true);
      });

      it('should handle mixed separators', () => {
        expect(matchesGlob('/blog/2024/post.md', '\\blog/2024\\*.md')).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should warn and return false for invalid patterns', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = matchesGlob('/blog/post.md', '/blog/[unclosed');

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid glob pattern: /blog/[unclosed');

        consoleWarnSpy.mockRestore();
      });
    });

    describe('cache invalidation use cases', () => {
      it('should match all blog posts for full blog invalidation', () => {
        const pattern = '/blog/**';
        expect(matchesGlob('/blog/post-1.html', pattern)).toBe(true);
        expect(matchesGlob('/blog/post-2.html', pattern)).toBe(true);
        expect(matchesGlob('/blog/category/tech/post.html', pattern)).toBe(true);
      });

      it('should match category-specific invalidation', () => {
        const pattern = '/blog/category/tech/**';
        expect(matchesGlob('/blog/category/tech/post-1.html', pattern)).toBe(true);
        expect(matchesGlob('/blog/category/tech/2024/post.html', pattern)).toBe(true);
        expect(matchesGlob('/blog/category/news/post.html', pattern)).toBe(false);
      });

      it('should match tag page invalidation', () => {
        const pattern = '/tags/*/index.html';
        expect(matchesGlob('/tags/javascript/index.html', pattern)).toBe(true);
        expect(matchesGlob('/tags/python/index.html', pattern)).toBe(true);
        expect(matchesGlob('/tags/javascript/page-2.html', pattern)).toBe(false);
      });

      it('should match RSS feed pages', () => {
        const pattern = '/**/feed.xml';
        expect(matchesGlob('/feed.xml', pattern)).toBe(true);
        expect(matchesGlob('/blog/feed.xml', pattern)).toBe(true);
        expect(matchesGlob('/blog/category/tech/feed.xml', pattern)).toBe(true);
      });

      it('should match sitemap files', () => {
        const pattern = '/**/sitemap*.xml';
        expect(matchesGlob('/sitemap.xml', pattern)).toBe(true);
        expect(matchesGlob('/sitemap-blog.xml', pattern)).toBe(true);
        expect(matchesGlob('/blog/sitemap-posts.xml', pattern)).toBe(true);
      });
    });

    describe('performance patterns', () => {
      it('should handle many consecutive path segments', () => {
        const pattern = '/a/**/z.html';
        expect(matchesGlob('/a/b/c/d/e/f/g/z.html', pattern)).toBe(true);
      });

      it('should handle long file names', () => {
        const pattern = '/blog/**/*.md';
        const longFileName = '/blog/' + 'a'.repeat(100) + '.md';
        expect(matchesGlob(longFileName, pattern)).toBe(true);
      });
    });
  });
});
