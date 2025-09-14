import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderPage } from '../../core/templates.js';
import type { StatiConfig, PageModel } from '../../types/index.js';
import type { Eta } from 'eta';

// Create hoisted mocks
const { mockPathExists, mockGlob, MockEta } = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  mockGlob: vi.fn(),
  MockEta: vi.fn(),
}));

// Mock dependencies
vi.mock('fs-extra', () => ({
  default: {
    pathExists: mockPathExists,
  },
}));

vi.mock('fast-glob', () => ({
  default: mockGlob,
}));

vi.mock('eta', () => ({
  Eta: MockEta,
}));

describe('Collection Aggregation', () => {
  let mockConfig: StatiConfig;
  let mockEtaInstance: {
    renderAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      srcDir: 'src',
      outDir: 'dist',
      staticDir: 'static',
      site: {
        title: 'Test Site',
        baseUrl: 'https://example.com',
      },
    };

    mockEtaInstance = {
      renderAsync: vi.fn(),
    };

    MockEta.mockReturnValue(mockEtaInstance);
    mockGlob.mockResolvedValue([]);
    mockPathExists.mockResolvedValue(true);
  });

  it('should provide collection data for blog index page', async () => {
    const blogIndexPage: PageModel = {
      slug: '/blog',
      url: '/blog',
      sourcePath: '/test/project/src/blog/index.md',
      frontMatter: { title: 'Blog' },
      content: '# Blog Index',
    };

    const blogPost1: PageModel = {
      slug: '/blog/post-1',
      url: '/blog/post-1',
      sourcePath: '/test/project/src/blog/post-1.md',
      frontMatter: { title: 'Post 1', tags: ['tech', 'javascript'] },
      content: '# Post 1',
      publishedAt: new Date('2023-01-01'),
    };

    const blogPost2: PageModel = {
      slug: '/blog/post-2',
      url: '/blog/post-2',
      sourcePath: '/test/project/src/blog/post-2.md',
      frontMatter: { title: 'Post 2', tags: ['tech', 'typescript'] },
      content: '# Post 2',
      publishedAt: new Date('2023-01-02'),
    };

    const aboutPage: PageModel = {
      slug: '/about',
      url: '/about',
      sourcePath: '/test/project/src/about.md',
      frontMatter: { title: 'About' },
      content: '# About',
    };

    const allPages = [blogIndexPage, blogPost1, blogPost2, aboutPage];

    mockEtaInstance.renderAsync.mockResolvedValue('<html>Rendered blog index</html>');

    await renderPage(
      blogIndexPage,
      '<h1>Blog Index</h1>',
      mockConfig,
      mockEtaInstance as unknown as Eta,
      [],
      allPages,
    );

    // Verify renderAsync was called with collection data
    expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        collection: expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({ url: '/blog/post-1' }),
            expect.objectContaining({ url: '/blog/post-2' }),
          ]),
          children: expect.arrayContaining([
            expect.objectContaining({ url: '/blog/post-1' }),
            expect.objectContaining({ url: '/blog/post-2' }),
          ]),
          recentPages: expect.arrayContaining([
            expect.objectContaining({ url: '/blog/post-2' }), // Most recent first
            expect.objectContaining({ url: '/blog/post-1' }),
          ]),
          pagesByTag: expect.objectContaining({
            tech: expect.arrayContaining([
              expect.objectContaining({ url: '/blog/post-1' }),
              expect.objectContaining({ url: '/blog/post-2' }),
            ]),
            javascript: expect.arrayContaining([expect.objectContaining({ url: '/blog/post-1' })]),
            typescript: expect.arrayContaining([expect.objectContaining({ url: '/blog/post-2' })]),
          }),
          metadata: expect.objectContaining({
            totalPages: 2,
            hasChildren: true,
            collectionPath: '/blog',
            collectionName: 'blog',
          }),
        }),
      }),
    );
  });

  it('should provide collection data for root index page', async () => {
    const rootIndexPage: PageModel = {
      slug: '/',
      url: '/',
      sourcePath: '/test/project/src/index.md',
      frontMatter: { title: 'Home' },
      content: '# Home',
    };

    const aboutPage: PageModel = {
      slug: '/about',
      url: '/about',
      sourcePath: '/test/project/src/about.md',
      frontMatter: { title: 'About' },
      content: '# About',
    };

    const contactPage: PageModel = {
      slug: '/contact',
      url: '/contact',
      sourcePath: '/test/project/src/contact.md',
      frontMatter: { title: 'Contact' },
      content: '# Contact',
    };

    const allPages = [rootIndexPage, aboutPage, contactPage];

    mockEtaInstance.renderAsync.mockResolvedValue('<html>Rendered home</html>');

    await renderPage(
      rootIndexPage,
      '<h1>Home</h1>',
      mockConfig,
      mockEtaInstance as unknown as Eta,
      [],
      allPages,
    );

    // Verify collection data for root
    expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        collection: expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({ url: '/about' }),
            expect.objectContaining({ url: '/contact' }),
          ]),
          metadata: expect.objectContaining({
            totalPages: 2,
            hasChildren: true,
            collectionPath: '/',
            collectionName: 'Home',
          }),
        }),
      }),
    );
  });

  it('should not provide collection data for non-index pages', async () => {
    const blogPost: PageModel = {
      slug: '/blog/post-1',
      url: '/blog/post-1',
      sourcePath: '/test/project/src/blog/post-1.md',
      frontMatter: { title: 'Post 1' },
      content: '# Post 1',
    };

    const blogIndexPage: PageModel = {
      slug: '/blog',
      url: '/blog',
      sourcePath: '/test/project/src/blog/index.md',
      frontMatter: { title: 'Blog' },
      content: '# Blog',
    };

    const allPages = [blogPost, blogIndexPage];

    mockEtaInstance.renderAsync.mockResolvedValue('<html>Rendered post</html>');

    await renderPage(
      blogPost,
      '<h1>Post 1</h1>',
      mockConfig,
      mockEtaInstance as unknown as Eta,
      [],
      allPages,
    );

    // Verify no collection data for regular pages
    expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        collection: undefined,
      }),
    );
  });

  it('should handle collections with nested subdirectories', async () => {
    const docsIndexPage: PageModel = {
      slug: '/docs',
      url: '/docs',
      sourcePath: '/test/project/src/docs/index.md',
      frontMatter: { title: 'Documentation' },
      content: '# Docs',
    };

    const guideIndexPage: PageModel = {
      slug: '/docs/guide',
      url: '/docs/guide',
      sourcePath: '/test/project/src/docs/guide/index.md',
      frontMatter: { title: 'Guide' },
      content: '# Guide',
    };

    const gettingStartedPage: PageModel = {
      slug: '/docs/guide/getting-started',
      url: '/docs/guide/getting-started',
      sourcePath: '/test/project/src/docs/guide/getting-started.md',
      frontMatter: { title: 'Getting Started' },
      content: '# Getting Started',
    };

    const apiPage: PageModel = {
      slug: '/docs/api',
      url: '/docs/api',
      sourcePath: '/test/project/src/docs/api.md',
      frontMatter: { title: 'API Reference' },
      content: '# API',
    };

    const allPages = [docsIndexPage, guideIndexPage, gettingStartedPage, apiPage];

    mockEtaInstance.renderAsync.mockResolvedValue('<html>Rendered docs index</html>');

    await renderPage(
      docsIndexPage,
      '<h1>Documentation</h1>',
      mockConfig,
      mockEtaInstance as unknown as Eta,
      [],
      allPages,
    );

    // Verify docs index gets all docs pages
    expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        collection: expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({ url: '/docs/guide' }),
            expect.objectContaining({ url: '/docs/guide/getting-started' }),
            expect.objectContaining({ url: '/docs/api' }),
          ]),
          children: expect.arrayContaining([
            expect.objectContaining({ url: '/docs/guide' }),
            expect.objectContaining({ url: '/docs/api' }),
          ]),
          metadata: expect.objectContaining({
            totalPages: 3,
            collectionPath: '/docs',
            collectionName: 'docs',
          }),
        }),
      }),
    );
  });

  it('should sort pages by publishedAt date correctly', async () => {
    const newsIndexPage: PageModel = {
      slug: '/news',
      url: '/news',
      sourcePath: '/test/project/src/news/index.md',
      frontMatter: { title: 'News' },
      content: '# News',
    };

    const oldNews: PageModel = {
      slug: '/news/old-news',
      url: '/news/old-news',
      sourcePath: '/test/project/src/news/old-news.md',
      frontMatter: { title: 'Old News' },
      content: '# Old',
      publishedAt: new Date('2023-01-01'),
    };

    const recentNews: PageModel = {
      slug: '/news/recent-news',
      url: '/news/recent-news',
      sourcePath: '/test/project/src/news/recent-news.md',
      frontMatter: { title: 'Recent News' },
      content: '# Recent',
      publishedAt: new Date('2023-01-03'),
    };

    const middleNews: PageModel = {
      slug: '/news/middle-news',
      url: '/news/middle-news',
      sourcePath: '/test/project/src/news/middle-news.md',
      frontMatter: { title: 'Middle News' },
      content: '# Middle',
      publishedAt: new Date('2023-01-02'),
    };

    const allPages = [newsIndexPage, oldNews, recentNews, middleNews];

    mockEtaInstance.renderAsync.mockResolvedValue('<html>Rendered news</html>');

    await renderPage(
      newsIndexPage,
      '<h1>News</h1>',
      mockConfig,
      mockEtaInstance as unknown as Eta,
      [],
      allPages,
    );

    // Verify pages are sorted by date (most recent first)
    const callArgs = mockEtaInstance.renderAsync.mock.calls[0]?.[1];
    const recentPages = callArgs?.collection?.recentPages;

    expect(recentPages[0].url).toBe('/news/recent-news');
    expect(recentPages[1].url).toBe('/news/middle-news');
    expect(recentPages[2].url).toBe('/news/old-news');
  });

  it('should use index.eta layout for collection index pages when available', async () => {
    const blogIndexPage: PageModel = {
      slug: '/blog',
      url: '/blog',
      sourcePath: '/test/project/src/blog/index.md',
      frontMatter: { title: 'Blog' },
      content: '# Blog Index',
    };

    const blogPost: PageModel = {
      slug: '/blog/post-1',
      url: '/blog/post-1',
      sourcePath: '/test/project/src/blog/post-1.md',
      frontMatter: { title: 'Post 1' },
      content: '# Post 1',
    };

    const allPages = [blogIndexPage, blogPost];

    // Mock pathExists to return true for blog/index.eta but false for blog/layout.eta
    mockPathExists.mockImplementation((path: string) => {
      if (path.includes('index.eta') && path.includes('blog')) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });

    mockEtaInstance.renderAsync.mockResolvedValue('<html>Blog index template</html>');

    await renderPage(
      blogIndexPage,
      '<h1>Blog Index</h1>',
      mockConfig,
      mockEtaInstance as unknown as Eta,
      [],
      allPages,
    );

    // Verify it used the index.eta template
    expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
      expect.stringContaining('index.eta'),
      expect.objectContaining({
        collection: expect.any(Object),
      }),
    );
  });

  it('should fall back to layout.eta for collection index pages when index.eta not available', async () => {
    const blogIndexPage: PageModel = {
      slug: '/blog',
      url: '/blog',
      sourcePath: '/test/project/src/blog/index.md',
      frontMatter: { title: 'Blog' },
      content: '# Blog Index',
    };

    const blogPost: PageModel = {
      slug: '/blog/post-1',
      url: '/blog/post-1',
      sourcePath: '/test/project/src/blog/post-1.md',
      frontMatter: { title: 'Post 1' },
      content: '# Post 1',
    };

    const allPages = [blogIndexPage, blogPost];

    // Mock pathExists to return false for blog/index.eta but true for blog/layout.eta
    mockPathExists.mockImplementation((path: string) => {
      if (path.includes('layout.eta') && path.includes('blog')) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });

    mockEtaInstance.renderAsync.mockResolvedValue('<html>Blog layout template</html>');

    await renderPage(
      blogIndexPage,
      '<h1>Blog Index</h1>',
      mockConfig,
      mockEtaInstance as unknown as Eta,
      [],
      allPages,
    );

    // Verify it fell back to layout.eta
    expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
      expect.stringContaining('layout.eta'),
      expect.objectContaining({
        collection: expect.any(Object),
      }),
    );
  });

  it('should not use index.eta for non-collection pages', async () => {
    const blogPost: PageModel = {
      slug: '/blog/post-1',
      url: '/blog/post-1',
      sourcePath: '/test/project/src/blog/post-1.md',
      frontMatter: { title: 'Post 1' },
      content: '# Post 1',
    };

    const blogIndexPage: PageModel = {
      slug: '/blog',
      url: '/blog',
      sourcePath: '/test/project/src/blog/index.md',
      frontMatter: { title: 'Blog' },
      content: '# Blog',
    };

    const allPages = [blogPost, blogIndexPage];

    // Mock pathExists to return true for both index.eta and layout.eta
    mockPathExists.mockImplementation((path: string) => {
      if ((path.includes('index.eta') || path.includes('layout.eta')) && path.includes('blog')) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });

    mockEtaInstance.renderAsync.mockResolvedValue('<html>Blog post template</html>');

    await renderPage(
      blogPost,
      '<h1>Post 1</h1>',
      mockConfig,
      mockEtaInstance as unknown as Eta,
      [],
      allPages,
    );

    // Verify it used layout.eta instead of index.eta (since this is not a collection index page)
    expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
      expect.stringContaining('layout.eta'),
      expect.objectContaining({
        collection: undefined, // No collection data for regular pages
      }),
    );
  });
});
