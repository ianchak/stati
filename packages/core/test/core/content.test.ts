import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadContent } from '../../src/core/content.js';
import { FrontMatterError } from '../../src/core/utils/front-matter.utils.js';
import type { StatiConfig } from '../../src/types/index.js';

// Create hoisted mocks
const { mockReadFile, mockGlob } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockGlob: vi.fn(),
}));

// Mock all dependencies at the top level
vi.mock('fs-extra', () => ({
  default: {
    readFile: mockReadFile,
  },
}));

vi.mock('tinyglobby', () => ({
  glob: mockGlob,
}));

describe('content.ts', () => {
  const mockConfig: StatiConfig = {
    srcDir: 'src',
    outDir: 'dist',
    staticDir: 'static',
    site: {
      title: 'Test Site',
      baseUrl: 'https://example.com',
    },
  };

  const DRAFT_AND_PUBLISHED = {
    '/test/project/src/published.md': '---\ntitle: Published\n---\n# Published content',
    '/test/project/src/draft.md': '---\ntitle: Draft\ndraft: true\n---\n# Draft content',
  };

  /** Mocks the content directory: glob lists the files in the given order, read by path */
  function mockContentFiles(files: Record<string, string>): void {
    mockGlob.mockResolvedValue(Object.keys(files));
    mockReadFile.mockImplementation(async (path: string) => files[path]);
  }

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock process.cwd() to return a consistent path
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadContent', () => {
    it('should load content from markdown files, in path order', async () => {
      mockContentFiles({
        '/test/project/src/index.md': '---\ntitle: Home\n---\n# Welcome',
        '/test/project/src/about.md': '---\ntitle: About\n---\n# About us',
      });

      const pages = await loadContent(mockConfig);

      expect(pages).toEqual([
        {
          slug: '/about',
          url: '/about',
          sourcePath: '/test/project/src/about.md',
          frontMatter: { title: 'About' },
          content: '# About us',
          wordCount: 2,
          readingTime: 1,
        },
        {
          slug: '/',
          url: '/',
          sourcePath: '/test/project/src/index.md',
          frontMatter: { title: 'Home' },
          content: '# Welcome',
          wordCount: 1,
          readingTime: 1,
        },
      ]);
    });

    describe('word count and reading time', () => {
      const words = (count: number) => Array.from({ length: count }, (_, i) => `w${i}`).join(' ');

      it('counts the words of the body, without the front matter', async () => {
        mockContentFiles({
          '/test/project/src/post.md': `---\ntitle: A title of five words\ntags: [one, two]\n---\n${words(7)}`,
        });

        const [page] = await loadContent(mockConfig);

        expect(page!.wordCount).toBe(7);
      });

      it('leaves out code blocks and HTML tags', async () => {
        mockContentFiles({
          '/test/project/src/post.md':
            '---\ntitle: Post\n---\nSome <em>text</em> here\n\n```js\nconst a = 1;\n```\n\nand more',
        });

        const [page] = await loadContent(mockConfig);

        expect(page!.wordCount).toBe(5);
      });

      it('rounds the reading time to whole minutes, at least 1, at 230 words a minute', async () => {
        mockContentFiles({
          '/test/project/src/short.md': `---\ntitle: S\n---\n${words(3)}`,
          '/test/project/src/long.md': `---\ntitle: L\n---\n${words(1150)}`,
        });

        const pages = await loadContent(mockConfig);

        expect(pages.map((page) => [page.url, page.readingTime])).toEqual([
          ['/long', 5],
          ['/short', 1],
        ]);
      });

      it('reads the speed from readingTime.wordsPerMinute', async () => {
        mockContentFiles({
          '/test/project/src/long.md': `---\ntitle: L\n---\n${words(1000)}`,
        });

        const [page] = await loadContent({ ...mockConfig, readingTime: { wordsPerMinute: 100 } });

        expect(page!.wordCount).toBe(1000);
        expect(page!.readingTime).toBe(10);
      });

      it('gives a page with no body one minute', async () => {
        mockContentFiles({ '/test/project/src/empty.md': '---\ntitle: Empty\n---\n' });

        const [page] = await loadContent(mockConfig);

        expect(page!.wordCount).toBe(0);
        expect(page!.readingTime).toBe(1);
      });
    });

    it('should skip draft posts by default', async () => {
      mockContentFiles(DRAFT_AND_PUBLISHED);

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(1);
      expect(pages[0]!.frontMatter.title).toBe('Published');
    });

    it('should include draft posts when includeDrafts is true', async () => {
      mockContentFiles(DRAFT_AND_PUBLISHED);

      const pages = await loadContent(mockConfig, true);

      expect(pages).toHaveLength(2);
      expect(pages.find((p) => p.frontMatter.title === 'Draft')).toBeDefined();
    });

    it('should skip draft posts when includeDrafts is explicitly false', async () => {
      mockContentFiles(DRAFT_AND_PUBLISHED);

      const pages = await loadContent(mockConfig, false);

      expect(pages).toHaveLength(1);
      expect(pages[0]!.frontMatter.title).toBe('Published');
    });

    it('should parse publishedAt date from frontmatter', async () => {
      const mockFiles = ['/test/project/src/post.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue(
        '---\ntitle: Post\npublishedAt: 2023-01-01\n---\n# Post content',
      );

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.publishedAt).toEqual(new Date('2023-01-01'));
    });

    it('should not set publishedAt if not a string or Date', async () => {
      const mockFiles = ['/test/project/src/post.md'];
      mockGlob.mockResolvedValue(mockFiles);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockReadFile.mockResolvedValue('---\ntitle: Post\npublishedAt: 123\n---\n# Post content');

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.publishedAt).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"publishedAt"'));
    });

    it('should parse an unquoted YAML date (Date object) in publishedAt', async () => {
      mockGlob.mockResolvedValue(['/test/project/src/post.md']);
      mockReadFile.mockResolvedValue('---\npublishedAt: 2026-01-01\n---\n# Post');

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.publishedAt).toEqual(new Date('2026-01-01'));
    });

    it('should fall back to the date field', async () => {
      mockGlob.mockResolvedValue(['/test/project/src/post.md']);
      mockReadFile.mockResolvedValue("---\ndate: '2026-06-01'\n---\n# Post");

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.publishedAt).toEqual(new Date('2026-06-01'));
    });

    it('should warn and skip an invalid publishedAt in favor of a valid date', async () => {
      mockGlob.mockResolvedValue(['/test/project/src/post.md']);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReadFile.mockResolvedValue("---\npublishedAt: soon\ndate: '2026-06-01'\n---\n# Post");

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.publishedAt).toEqual(new Date('2026-06-01'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('/test/project/src/post.md'));
    });

    it('should warn without converting a mapping or list and use the fallback date', async () => {
      mockGlob.mockResolvedValue(['/test/project/src/post.md']);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReadFile.mockResolvedValue(
        "---\npublishedAt: { toString: invalid }\npublished: [soon]\ndate: '2026-06-01'\n---\n# Post",
      );

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.publishedAt).toEqual(new Date('2026-06-01'));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"publishedAt" of /test/project/src/post.md: a mapping'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"published" of /test/project/src/post.md: a list'),
      );
    });

    it('should handle nested directory structure', async () => {
      mockContentFiles({
        '/test/project/src/blog/first-post.md': '---\ntitle: First Post\n---\n# First post content',
        '/test/project/src/blog/category/second-post.md':
          '---\ntitle: Second Post\n---\n# Second post content',
      });

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(2);
      // Forward slashes on every platform, also two folders deep
      expect(pages[0]!.slug).toBe('/blog/category/second-post');
      expect(pages[0]!.url).toBe('/blog/category/second-post');
      expect(pages[0]!.frontMatter.title).toBe('Second Post');
      expect(pages[1]!.slug).toBe('/blog/first-post');
      expect(pages[1]!.url).toBe('/blog/first-post');
      expect(pages[1]!.frontMatter.title).toBe('First Post');
    });

    it('should handle index files correctly', async () => {
      mockContentFiles({
        '/test/project/src/index.md': '---\ntitle: Home\n---\n# Home content',
        '/test/project/src/blog/index.md': '---\ntitle: Blog\n---\n# Blog index',
      });

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(2);
      // The slug for /blog/index.md should be /blog, not /blog/index
      expect(pages[0]!.slug).toBe('/blog');
      expect(pages[0]!.url).toBe('/blog');
      expect(pages[0]!.frontMatter.title).toBe('Blog');
      expect(pages[1]!.slug).toBe('/');
      expect(pages[1]!.url).toBe('/');
      expect(pages[1]!.frontMatter.title).toBe('Home');
    });

    it('should respect permalink in frontmatter', async () => {
      const mockFiles = ['/test/project/src/special.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue(
        '---\ntitle: Special\npermalink: /custom-url/\n---\n# Special content',
      );

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.slug).toBe('/special');
      expect(pages[0]!.url).toBe('/custom-url/');
    });

    it('should ignore non-string permalink', async () => {
      const mockFiles = ['/test/project/src/special.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('---\ntitle: Special\npermalink: 123\n---\n# Special content');

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.slug).toBe('/special');
      expect(pages[0]!.url).toBe('/special');
    });

    it('should handle empty content directory', async () => {
      mockGlob.mockResolvedValue([]);

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(0);
    });

    it('should use correct glob pattern and options', async () => {
      mockGlob.mockResolvedValue([]);

      await loadContent(mockConfig);

      expect(mockGlob).toHaveBeenCalledWith('**/*.md', {
        cwd: expect.stringMatching(/[\\/]test[\\/]project[\\/]src$/),
        absolute: true,
        ignore: ['**/_*/**', '_*/**'],
        expandDirectories: false,
      });
    });

    it('should preserve all frontmatter data', async () => {
      const mockFiles = ['/test/project/src/post.md'];
      mockGlob.mockResolvedValue(mockFiles);

      const frontMatter = {
        title: 'Post',
        description: 'A test post',
        tags: ['test', 'example'],
        customField: 'custom value',
        order: 1,
      };

      mockReadFile.mockResolvedValue(
        '---\ntitle: Post\ndescription: A test post\ntags: [test, example]\ncustomField: custom value\norder: 1\n---\n# Post content',
      );

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.frontMatter).toEqual(frontMatter);
    });

    it('should handle files with no frontmatter', async () => {
      const mockFiles = ['/test/project/src/simple.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('# Simple markdown without frontmatter');

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(1);
      expect(pages[0]!.frontMatter).toEqual({});
      expect(pages[0]!.content).toBe('# Simple markdown without frontmatter');
    });

    it('should handle URL computation for index files in subdirectories', async () => {
      const mockFiles = ['/test/project/src/docs/api/index.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('---\ntitle: API Docs\n---\n# API Documentation');

      const pages = await loadContent(mockConfig);

      // Handle Windows path separators in slug
      expect(pages[0]!.slug.replace(/\\/g, '/')).toBe('/docs/api');
      // The URL for index files in subdirectories doesn't get trailing slash
      // because computeUrl only affects slugs ending with "/index"
      expect(pages[0]!.url.replace(/\\/g, '/')).toBe('/docs/api');
    });

    it('should read unquoted dates in front matter as dates', async () => {
      mockGlob.mockResolvedValue(['/test/project/src/post.md']);
      mockReadFile.mockResolvedValue('---\ndate: 2026-01-01\nupdated: 2026-02-01T10:00:00Z\n---\n');

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.frontMatter).toEqual({
        date: new Date('2026-01-01T00:00:00.000Z'),
        updated: new Date('2026-02-01T10:00:00.000Z'),
      });
      expect(pages[0]!.publishedAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });

    it('should report invalid front matter with its file and line', async () => {
      mockGlob.mockResolvedValue(['/test/project/src/post.md']);
      mockReadFile.mockResolvedValue('---\ntitle: One\ntitle: Two\n---\n# Post');

      const loading = loadContent(mockConfig);

      await expect(loading).rejects.toThrow(FrontMatterError);
      await expect(loading).rejects.toThrow(
        'Invalid front matter in src/post.md at line 3, column 1: duplicated mapping key.',
      );
    });

    it('should handle files with Windows path separators', async () => {
      // Mock Windows-style paths
      const mockFiles = ['/test/project/src/blog\\post.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('---\ntitle: Post\n---\n# Post content');

      const pages = await loadContent(mockConfig);

      // The path normalization should still work correctly
      expect(pages[0]).toBeDefined();
      expect(pages[0]!.sourcePath).toBe('/test/project/src/blog\\post.md');
    });

    it('should read title, description and tags that YAML parses as other types as text', async () => {
      mockContentFiles({
        '/test/project/src/a.md':
          '---\ntitle: 1984\ndescription: 42\ntags: [2024, news]\nseo:\n  keywords: [1]\n---\nBody',
        '/test/project/src/b.md': '---\ntitle: 2024-01-01\n---\nBody',
      });

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.frontMatter).toEqual({
        title: '1984',
        description: '42',
        tags: ['2024', 'news'],
        seo: { keywords: ['1'] },
      });
      expect(pages[1]!.frontMatter.title).toBe('2024-01-01');
    });

    it('should drop null tags and warn with the field and the file', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockContentFiles({ '/test/project/src/a.md': '---\ntitle: A\ntags: [~, news]\n---\nBody' });

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.frontMatter.tags).toEqual(['news']);
      expect(warn).toHaveBeenCalledWith('Ignoring empty entry in "tags" of src/a.md');
    });
  });
});
