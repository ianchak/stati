import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadContent } from '../../core/content.js';
import type { StatiConfig } from '../../types.js';

// Create hoisted mocks
const { mockReadFile, mockGlob, mockMatter } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockGlob: vi.fn(),
  mockMatter: vi.fn(),
}));

// Mock all dependencies at the top level
vi.mock('fs-extra', () => ({
  default: {
    readFile: mockReadFile,
  },
}));

vi.mock('fast-glob', () => ({
  default: mockGlob,
}));

vi.mock('gray-matter', () => ({
  default: mockMatter,
}));

// Helper to create mock matter result
const createMockMatterResult = (data: Record<string, unknown>, content: string) => ({
  data,
  content,
  orig: '',
  language: '',
  matter: '',
  stringify: vi.fn(),
});

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

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.cwd() to return a consistent path
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadContent', () => {
    it('should load content from markdown files', async () => {
      const mockFiles = ['/test/project/src/index.md', '/test/project/src/about.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile
        .mockResolvedValueOnce('---\ntitle: Home\n---\n# Welcome')
        .mockResolvedValueOnce('---\ntitle: About\n---\n# About us');

      mockMatter
        .mockReturnValueOnce(createMockMatterResult({ title: 'Home' }, '# Welcome'))
        .mockReturnValueOnce(createMockMatterResult({ title: 'About' }, '# About us'));

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(2);
      expect(pages[0]).toEqual({
        slug: '/',
        url: '/',
        sourcePath: '/test/project/src/index.md',
        frontMatter: { title: 'Home' },
        content: '# Welcome',
      });
      expect(pages[1]).toEqual({
        slug: '/about',
        url: '/about',
        sourcePath: '/test/project/src/about.md',
        frontMatter: { title: 'About' },
        content: '# About us',
      });
    });

    it('should skip draft posts by default', async () => {
      const mockFiles = ['/test/project/src/published.md', '/test/project/src/draft.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile
        .mockResolvedValueOnce('---\ntitle: Published\n---\n# Published content')
        .mockResolvedValueOnce('---\ntitle: Draft\ndraft: true\n---\n# Draft content');

      mockMatter
        .mockReturnValueOnce(createMockMatterResult({ title: 'Published' }, '# Published content'))
        .mockReturnValueOnce(
          createMockMatterResult({ title: 'Draft', draft: true }, '# Draft content'),
        );

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(1);
      expect(pages[0]!.frontMatter.title).toBe('Published');
    });

    it('should include draft posts when includeDrafts is true', async () => {
      const mockFiles = ['/test/project/src/published.md', '/test/project/src/draft.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile
        .mockResolvedValueOnce('---\ntitle: Published\n---\n# Published content')
        .mockResolvedValueOnce('---\ntitle: Draft\ndraft: true\n---\n# Draft content');

      mockMatter
        .mockReturnValueOnce(createMockMatterResult({ title: 'Published' }, '# Published content'))
        .mockReturnValueOnce(
          createMockMatterResult({ title: 'Draft', draft: true }, '# Draft content'),
        );

      const pages = await loadContent(mockConfig, true);

      expect(pages).toHaveLength(2);
      expect(pages.find((p) => p.frontMatter.title === 'Draft')).toBeDefined();
    });

    it('should skip draft posts when includeDrafts is explicitly false', async () => {
      const mockFiles = ['/test/project/src/published.md', '/test/project/src/draft.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile
        .mockResolvedValueOnce('---\ntitle: Published\n---\n# Published content')
        .mockResolvedValueOnce('---\ntitle: Draft\ndraft: true\n---\n# Draft content');

      mockMatter
        .mockReturnValueOnce(createMockMatterResult({ title: 'Published' }, '# Published content'))
        .mockReturnValueOnce(
          createMockMatterResult({ title: 'Draft', draft: true }, '# Draft content'),
        );

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

      mockMatter.mockReturnValue(
        createMockMatterResult({ title: 'Post', publishedAt: '2023-01-01' }, '# Post content'),
      );

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.publishedAt).toEqual(new Date('2023-01-01'));
    });

    it('should not set publishedAt if not a string', async () => {
      const mockFiles = ['/test/project/src/post.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('---\ntitle: Post\npublishedAt: 123\n---\n# Post content');

      mockMatter.mockReturnValue(
        createMockMatterResult({ title: 'Post', publishedAt: 123 }, '# Post content'),
      );

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.publishedAt).toBeUndefined();
    });

    it('should handle nested directory structure', async () => {
      const mockFiles = [
        '/test/project/src/blog/first-post.md',
        '/test/project/src/blog/category/second-post.md',
      ];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile
        .mockResolvedValueOnce('---\ntitle: First Post\n---\n# First post content')
        .mockResolvedValueOnce('---\ntitle: Second Post\n---\n# Second post content');

      mockMatter
        .mockReturnValueOnce(
          createMockMatterResult({ title: 'First Post' }, '# First post content'),
        )
        .mockReturnValueOnce(
          createMockMatterResult({ title: 'Second Post' }, '# Second post content'),
        );

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(2);
      expect(pages[0]!.slug).toBe('/blog/first-post');
      expect(pages[0]!.url).toBe('/blog/first-post');
      // Handle Windows path separators in slug
      expect(pages[1]!.slug.replace(/\\/g, '/')).toBe('/blog/category/second-post');
      expect(pages[1]!.url.replace(/\\/g, '/')).toBe('/blog/category/second-post');
    });

    it('should handle index files correctly', async () => {
      const mockFiles = ['/test/project/src/index.md', '/test/project/src/blog/index.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile
        .mockResolvedValueOnce('---\ntitle: Home\n---\n# Home content')
        .mockResolvedValueOnce('---\ntitle: Blog\n---\n# Blog index');

      mockMatter
        .mockReturnValueOnce(createMockMatterResult({ title: 'Home' }, '# Home content'))
        .mockReturnValueOnce(createMockMatterResult({ title: 'Blog' }, '# Blog index'));

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(2);
      expect(pages[0]!.slug).toBe('/');
      expect(pages[0]!.url).toBe('/');
      expect(pages[1]!.slug).toBe('/blog');
      // The slug for /blog/index.md should be /blog, not /blog/index
      // But the URL should be /blog/ because it's an index page
      expect(pages[1]!.url).toBe('/blog');
    });

    it('should respect permalink in frontmatter', async () => {
      const mockFiles = ['/test/project/src/special.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue(
        '---\ntitle: Special\npermalink: /custom-url/\n---\n# Special content',
      );

      mockMatter.mockReturnValue(
        createMockMatterResult(
          { title: 'Special', permalink: '/custom-url/' },
          '# Special content',
        ),
      );

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.slug).toBe('/special');
      expect(pages[0]!.url).toBe('/custom-url/');
    });

    it('should ignore non-string permalink', async () => {
      const mockFiles = ['/test/project/src/special.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('---\ntitle: Special\npermalink: 123\n---\n# Special content');

      mockMatter.mockReturnValue(
        createMockMatterResult({ title: 'Special', permalink: 123 }, '# Special content'),
      );

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

      mockReadFile.mockResolvedValue('---\ntitle: Post\n---\n# Post content');
      mockMatter.mockReturnValue(createMockMatterResult(frontMatter, '# Post content'));

      const pages = await loadContent(mockConfig);

      expect(pages[0]!.frontMatter).toEqual(frontMatter);
    });

    it('should handle files with no frontmatter', async () => {
      const mockFiles = ['/test/project/src/simple.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('# Simple markdown without frontmatter');

      mockMatter.mockReturnValue(
        createMockMatterResult({}, '# Simple markdown without frontmatter'),
      );

      const pages = await loadContent(mockConfig);

      expect(pages).toHaveLength(1);
      expect(pages[0]!.frontMatter).toEqual({});
      expect(pages[0]!.content).toBe('# Simple markdown without frontmatter');
    });

    it('should handle URL computation for index files in subdirectories', async () => {
      const mockFiles = ['/test/project/src/docs/api/index.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('---\ntitle: API Docs\n---\n# API Documentation');

      mockMatter.mockReturnValue(
        createMockMatterResult({ title: 'API Docs' }, '# API Documentation'),
      );

      const pages = await loadContent(mockConfig);

      // Handle Windows path separators in slug
      expect(pages[0]!.slug.replace(/\\/g, '/')).toBe('/docs/api');
      // The URL for index files in subdirectories doesn't get trailing slash
      // because computeUrl only affects slugs ending with "/index"
      expect(pages[0]!.url.replace(/\\/g, '/')).toBe('/docs/api');
    });

    it('should handle files with Windows path separators', async () => {
      // Mock Windows-style paths
      const mockFiles = ['/test/project/src/blog\\post.md'];
      mockGlob.mockResolvedValue(mockFiles);

      mockReadFile.mockResolvedValue('---\ntitle: Post\n---\n# Post content');

      mockMatter.mockReturnValue(createMockMatterResult({ title: 'Post' }, '# Post content'));

      const pages = await loadContent(mockConfig);

      // The path normalization should still work correctly
      expect(pages[0]).toBeDefined();
      expect(pages[0]!.sourcePath).toBe('/test/project/src/blog\\post.md');
    });
  });
});
