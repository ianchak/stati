import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { build } from '../../src/core/build.js';
import type { BuildOptions } from '../../src/core/build.js';
import type { StatiConfig } from '../../src/types/index.js';
import type { RSSFeedConfig } from '../../src/types/rss.js';
import { setEnv } from '../../src/env.js';

// Create hoisted mocks that are available during module hoisting
const {
  mockEnsureDir,
  mockWriteFile,
  mockCopy,
  mockCopyFile,
  mockRemove,
  mockPathExists,
  mockReaddir,
  mockStat,
  mockLoadConfig,
  mockLoadContent,
  mockCreateMarkdownProcessor,
  mockRenderMarkdown,
  mockCreateTemplateEngine,
  mockRenderPage,
  mockLoadCacheManifest,
  mockSaveCacheManifest,
  mockShouldRebuildPage,
  mockCreateCacheEntry,
  mockUpdateCacheEntry,
  mockWithBuildLock,
  mockBuildNavigation,
  mockCompileTypeScript,
  mockAutoInjectBundles,
} = vi.hoisted(() => ({
  // fs-extra mocks
  mockEnsureDir: vi.fn(),
  mockWriteFile: vi.fn(),
  mockCopy: vi.fn(),
  mockCopyFile: vi.fn(),
  mockRemove: vi.fn(),
  mockPathExists: vi.fn(),
  mockReaddir: vi.fn(),
  mockStat: vi.fn(),
  // core module mocks
  mockLoadConfig: vi.fn(),
  mockLoadContent: vi.fn(),
  mockCreateMarkdownProcessor: vi.fn(),
  mockRenderMarkdown: vi.fn(),
  mockCreateTemplateEngine: vi.fn(),
  mockRenderPage: vi.fn(),
  mockBuildNavigation: vi.fn(),
  // TypeScript mocks
  mockCompileTypeScript: vi.fn(),
  mockAutoInjectBundles: vi.fn(),
  // ISG mocks
  mockLoadCacheManifest: vi.fn(),
  mockSaveCacheManifest: vi.fn(),
  mockShouldRebuildPage: vi.fn(),
  mockCreateCacheEntry: vi.fn(),
  mockUpdateCacheEntry: vi.fn(),
  mockWithBuildLock: vi.fn(),
}));

// Mock modules with implementation
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: mockEnsureDir,
    writeFile: mockWriteFile,
    copy: mockCopy,
    copyFile: mockCopyFile,
    remove: mockRemove,
    pathExists: mockPathExists,
    readdir: mockReaddir,
    stat: mockStat,
  },
}));

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: mockLoadConfig,
}));

vi.mock('../../src/core/content.js', () => ({
  loadContent: mockLoadContent,
}));

vi.mock('../../src/core/markdown.js', () => ({
  createMarkdownProcessor: mockCreateMarkdownProcessor,
  renderMarkdown: mockRenderMarkdown,
}));

vi.mock('../../src/core/templates.js', () => ({
  createTemplateEngine: mockCreateTemplateEngine,
  renderPage: mockRenderPage,
}));

vi.mock('../../src/core/navigation.js', () => ({
  buildNavigation: mockBuildNavigation,
}));

vi.mock('../../src/core/isg/manifest.js', () => ({
  loadCacheManifest: mockLoadCacheManifest,
  saveCacheManifest: mockSaveCacheManifest,
}));

vi.mock('../../src/core/isg/builder.js', () => ({
  shouldRebuildPage: mockShouldRebuildPage,
  createCacheEntry: mockCreateCacheEntry,
  updateCacheEntry: mockUpdateCacheEntry,
}));

vi.mock('../../src/core/isg/build-lock.js', () => ({
  withBuildLock: mockWithBuildLock,
}));

vi.mock('../../src/core/utils/typescript.utils.js', () => ({
  compileTypeScript: mockCompileTypeScript,
  autoInjectBundles: mockAutoInjectBundles,
}));

describe('build.ts', () => {
  const mockConfig: StatiConfig = {
    srcDir: 'src',
    outDir: 'dist',
    staticDir: 'static',
    site: {
      title: 'Test Site',
      baseUrl: 'https://example.com',
    },
  };

  const mockPages = [
    {
      slug: '/',
      url: '/',
      sourcePath: '/src/index.md',
      frontMatter: { title: 'Home' },
      content: '# Welcome to our site',
    },
    {
      slug: '/about',
      url: '/about',
      sourcePath: '/src/about.md',
      frontMatter: { title: 'About' },
      content: '# About us',
    },
    {
      slug: '/blog/post',
      url: '/blog/post',
      sourcePath: '/src/blog/post.md',
      frontMatter: { title: 'Blog Post' },
      content: '# My first post',
    },
  ];

  let mockMd: { render: ReturnType<typeof vi.fn> };
  let mockEta: { renderAsync: ReturnType<typeof vi.fn> };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');

    // Mock console.log to suppress build output in tests
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Setup default mocks
    mockLoadConfig.mockResolvedValue(mockConfig);
    mockLoadContent.mockResolvedValue(mockPages);

    mockMd = { render: vi.fn() };
    mockEta = { renderAsync: vi.fn() };

    mockCreateMarkdownProcessor.mockReturnValue(mockMd);
    mockCreateTemplateEngine.mockReturnValue(mockEta);
    mockRenderMarkdown.mockReturnValue({ html: '<h1>Rendered markdown</h1>', toc: [] });
    mockRenderPage.mockResolvedValue({
      html: '<html><body>Full page</body></html>',
      templatesLoaded: 1,
    });

    mockPathExists.mockResolvedValue(true);
    mockEnsureDir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([]);
    mockStat.mockResolvedValue({ size: 1024 });

    // Setup ISG mocks
    mockLoadCacheManifest.mockResolvedValue(null);
    mockSaveCacheManifest.mockResolvedValue(undefined);
    mockShouldRebuildPage.mockResolvedValue(true);
    mockCreateCacheEntry.mockResolvedValue({
      path: '/test.html',
      inputsHash: 'hash123',
      deps: [],
      tags: ['page'],
      renderedAt: new Date().toISOString(),
      ttlSeconds: 3600,
    });
    mockUpdateCacheEntry.mockResolvedValue({
      path: '/test.html',
      inputsHash: 'hash123',
      deps: [],
      tags: ['page'],
      renderedAt: new Date().toISOString(),
      ttlSeconds: 3600,
    });
    mockWithBuildLock.mockImplementation(async (cacheDir, buildFn) => buildFn());
    mockBuildNavigation.mockReturnValue([
      { title: 'Home', url: '/' },
      { title: 'About', url: '/about' },
      { title: 'Blog', url: '/blog' },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset environment to development after each test to prevent side effects
    setEnv('development');
  });

  describe('build', () => {
    it('should perform a basic build successfully', async () => {
      await build();

      expect(mockLoadConfig).toHaveBeenCalledWith('/test/project');
      expect(mockLoadContent).toHaveBeenCalledWith(mockConfig, undefined);
      expect(mockCreateMarkdownProcessor).toHaveBeenCalledWith(mockConfig);
      expect(mockCreateTemplateEngine).toHaveBeenCalledWith(mockConfig);
      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]dist$/),
      );
    });

    it('should create cache directory', async () => {
      await build();

      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]\.stati$/),
      );
    });

    it('should load configuration from custom path when provided', async () => {
      const options: BuildOptions = {
        configPath: '/custom/path/config.js',
      };

      await build(options);

      expect(mockLoadConfig).toHaveBeenCalledWith('/custom/path');
    });

    it('should clean output directory when clean option is true', async () => {
      const options: BuildOptions = {
        clean: true,
      };

      await build(options);

      expect(mockRemove).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]dist$/),
      );
      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]dist$/),
      );
    });

    it('should not clean output directory when clean option is false', async () => {
      const options: BuildOptions = {
        clean: false,
      };

      await build(options);

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]dist$/),
      );
    });

    it('should render all pages with correct output paths', async () => {
      await build();

      // Home page should be written to index.html
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]dist[\\/]index\.html$/),
        '<html><body>Full page</body></html>',
        'utf-8',
      );

      // About page should be written to about.html
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]dist[\\/]about\.html$/),
        '<html><body>Full page</body></html>',
        'utf-8',
      );

      // Blog post should be written to blog/post.html
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/[\\/]test[\\/]project[\\/]dist[\\/]blog[\\/]post\.html$/),
        '<html><body>Full page</body></html>',
        'utf-8',
      );
    });

    it('should handle pages with trailing slash URLs correctly', async () => {
      const pagesWithTrailingSlash = [
        {
          slug: '/docs',
          url: '/docs/',
          sourcePath: '/src/docs/index.md',
          frontMatter: { title: 'Docs' },
          content: '# Documentation',
        },
      ];

      mockLoadContent.mockResolvedValue(pagesWithTrailingSlash);

      await build();

      // Pages with trailing slash should create index.html in subdirectory
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]docs[/\\]index\.html$/),
        '<html><body>Full page</body></html>',
        'utf-8',
      );
    });

    it('should create directories for nested pages', async () => {
      await build();

      // Should ensure blog directory exists for blog post
      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]blog$/),
      );
    });

    it('should render markdown content for each page', async () => {
      await build();

      expect(mockRenderMarkdown).toHaveBeenCalledTimes(3);
      expect(mockRenderMarkdown).toHaveBeenCalledWith('# Welcome to our site', mockMd, true);
      expect(mockRenderMarkdown).toHaveBeenCalledWith('# About us', mockMd, true);
      expect(mockRenderMarkdown).toHaveBeenCalledWith('# My first post', mockMd, true);
    });

    it('should render each page with template', async () => {
      await build();

      expect(mockRenderPage).toHaveBeenCalledTimes(3);
      expect(mockRenderPage).toHaveBeenCalledWith(
        mockPages[0],
        '<h1>Rendered markdown</h1>',
        mockConfig,
        mockEta,
        expect.any(Array), // navigation parameter
        expect.any(Array), // allPages parameter
        undefined, // assets parameter
        expect.any(Array), // toc parameter
        expect.objectContaining({ error: expect.any(Function) }), // logger parameter
      );
    });

    it('should copy assets to dist directory', async () => {
      // Mock a static file for testing
      mockReaddir.mockResolvedValueOnce([{ name: 'style.css', isDirectory: () => false }]);

      await build();

      expect(mockCopyFile).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]test[/\\]project[/\\]static[/\\]style\.css$/),
        expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]style\.css$/),
      );
    });

    it('should not copy static assets when static directory does not exist', async () => {
      (mockPathExists as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await build();

      expect(mockPathExists).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]test[/\\]project[/\\]static$/),
      );
      expect(mockCopy).not.toHaveBeenCalled();
    });

    it('should execute beforeAll hook when provided', async () => {
      const beforeAllHook = vi.fn().mockResolvedValue(undefined);
      const configWithHooks = {
        ...mockConfig,
        hooks: {
          beforeAll: beforeAllHook,
        },
      };

      mockLoadConfig.mockResolvedValue(configWithHooks);

      await build();

      expect(beforeAllHook).toHaveBeenCalledWith({
        config: configWithHooks,
        pages: mockPages,
      });
    });

    it('should execute afterAll hook when provided', async () => {
      const afterAllHook = vi.fn().mockResolvedValue(undefined);
      const configWithHooks = {
        ...mockConfig,
        hooks: {
          afterAll: afterAllHook,
        },
      };

      mockLoadConfig.mockResolvedValue(configWithHooks);

      await build();

      expect(afterAllHook).toHaveBeenCalledWith({
        config: configWithHooks,
        pages: mockPages,
      });
    });

    it('should execute beforeRender and afterRender hooks for each page', async () => {
      const beforeRenderHook = vi.fn().mockResolvedValue(undefined);
      const afterRenderHook = vi.fn().mockResolvedValue(undefined);
      const configWithHooks = {
        ...mockConfig,
        hooks: {
          beforeRender: beforeRenderHook,
          afterRender: afterRenderHook,
        },
      };

      mockLoadConfig.mockResolvedValue(configWithHooks);

      await build();

      expect(beforeRenderHook).toHaveBeenCalledTimes(3);
      expect(afterRenderHook).toHaveBeenCalledTimes(3);

      // Check first page hooks
      expect(beforeRenderHook).toHaveBeenCalledWith({
        page: mockPages[0],
        config: configWithHooks,
      });
      expect(afterRenderHook).toHaveBeenCalledWith({
        page: mockPages[0],
        config: configWithHooks,
      });
    });

    it('should log build progress messages', async () => {
      await build();

      expect(consoleSpy).toHaveBeenCalledWith('Building your site...');
      expect(consoleSpy).toHaveBeenCalledWith('📄 Found 3 pages');
      expect(consoleSpy).toHaveBeenCalledWith('Built navigation with 3 top-level items');
      // ISG shows "Checking" for each page
      expect(consoleSpy).toHaveBeenCalledWith('Checking /');
      expect(consoleSpy).toHaveBeenCalledWith('Checking /about');
      expect(consoleSpy).toHaveBeenCalledWith('Checking /blog/post');
      expect(consoleSpy).toHaveBeenCalledWith('Copying static assets from static');
      expect(consoleSpy).toHaveBeenCalledWith('Copied 0 static assets');
    });

    it('should include version in build message when provided', async () => {
      await build({ cliVersion: '1.2.3' });

      expect(consoleSpy).toHaveBeenCalledWith('Building your site...');
    });

    it('should log clean message when cleaning', async () => {
      await build({ clean: true });

      expect(consoleSpy).toHaveBeenCalledWith('Cleaning output directory and ISG cache...');
    });

    it('should handle build with no pages', async () => {
      mockLoadContent.mockResolvedValue([]);

      await build();

      expect(consoleSpy).toHaveBeenCalledWith('📄 Found 0 pages');
      expect(mockRenderMarkdown).not.toHaveBeenCalled();
      expect(mockRenderPage).not.toHaveBeenCalled();
      // ISG cache manifest should still be saved even with no pages
      expect(mockSaveCacheManifest).toHaveBeenCalledTimes(1);
      expect(mockSaveCacheManifest).toHaveBeenCalledWith(
        expect.stringContaining('.stati'),
        expect.objectContaining({ entries: {} }),
      );
    });

    it('should handle build with force option', async () => {
      const options: BuildOptions = {
        force: true,
      };

      await build(options);

      // Force option should not affect the build process in current implementation
      // but should be passed through without errors
      expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('should handle complex nested page structure', async () => {
      const complexPages = [
        {
          slug: '/docs/api/v1',
          url: '/docs/api/v1',
          sourcePath: '/src/docs/api/v1.md',
          frontMatter: { title: 'API v1' },
          content: '# API Documentation v1',
        },
        {
          slug: '/docs/guide/setup',
          url: '/docs/guide/setup',
          sourcePath: '/src/docs/guide/setup.md',
          frontMatter: { title: 'Setup Guide' },
          content: '# Setup Guide',
        },
      ];

      mockLoadContent.mockResolvedValue(complexPages);

      await build();

      // Should create nested directory structure
      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]docs[/\\]api$/),
      );
      expect(mockEnsureDir).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]docs[/\\]guide$/),
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]docs[/\\]api[/\\]v1\.html$/),
        '<html><body>Full page</body></html>',
        'utf-8',
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]docs[/\\]guide[/\\]setup\.html$/),
        '<html><body>Full page</body></html>',
        'utf-8',
      );
    });

    it('should handle includeDrafts option', async () => {
      const buildOptions: BuildOptions = { includeDrafts: true };
      await build(buildOptions);

      expect(mockLoadContent).toHaveBeenCalledWith(mockConfig, true);
    });

    it('should generate sitemap when enabled', async () => {
      // Set environment to production for sitemap generation
      setEnv('production');

      const configWithSitemap: StatiConfig = {
        ...mockConfig,
        sitemap: {
          enabled: true,
          defaultPriority: 0.5,
          defaultChangeFreq: 'monthly',
        },
      };

      mockLoadConfig.mockResolvedValue(configWithSitemap);

      await build();

      // Should write sitemap.xml
      const sitemapCall = mockWriteFile.mock.calls.find((call) => call[0].includes('sitemap.xml'));
      expect(sitemapCall).toBeDefined();
      expect(sitemapCall?.[0]).toMatch(/[/\\]test[/\\]project[/\\]dist[/\\]sitemap\.xml$/);
      expect(sitemapCall?.[1]).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemapCall?.[1]).toContain('<urlset');
      expect(sitemapCall?.[1]).toContain('https://example.com/');
      expect(sitemapCall?.[1]).toContain('https://example.com/about');
    });

    it('should not generate sitemap when disabled', async () => {
      const configWithoutSitemap: StatiConfig = {
        ...mockConfig,
        sitemap: {
          enabled: false,
        },
      };

      mockLoadConfig.mockResolvedValue(configWithoutSitemap);

      await build();

      // Should not write sitemap.xml
      const sitemapCall = mockWriteFile.mock.calls.find((call) => call[0].includes('sitemap.xml'));
      expect(sitemapCall).toBeUndefined();
    });

    it('should generate robots.txt when enabled', async () => {
      // Set environment to production for robots.txt generation
      setEnv('production');

      const configWithRobots: StatiConfig = {
        ...mockConfig,
        robots: {
          enabled: true,
          allow: ['/'],
          disallow: ['/admin'],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithRobots);

      await build();

      // Should write robots.txt
      const robotsCall = mockWriteFile.mock.calls.find((call) => call[0].includes('robots.txt'));
      expect(robotsCall).toBeDefined();
      expect(robotsCall?.[0]).toMatch(/[/\\]test[/\\]project[/\\]dist[/\\]robots\.txt$/);
      expect(robotsCall?.[1]).toContain('User-agent: *');
      expect(robotsCall?.[1]).toContain('Allow: /');
      expect(robotsCall?.[1]).toContain('Disallow: /admin');
    });

    it('should not generate robots.txt when disabled', async () => {
      const configWithoutRobots: StatiConfig = {
        ...mockConfig,
        robots: {
          enabled: false,
        },
      };

      mockLoadConfig.mockResolvedValue(configWithoutRobots);

      await build();

      // Should not write robots.txt
      const robotsCall = mockWriteFile.mock.calls.find((call) => call[0].includes('robots.txt'));
      expect(robotsCall).toBeUndefined();
    });

    it('should handle sitemap and robots.txt write errors gracefully', async () => {
      // Set environment to production for sitemap/robots.txt generation
      setEnv('production');

      const configWithBoth: StatiConfig = {
        ...mockConfig,
        sitemap: { enabled: true },
        robots: { enabled: true },
      };

      mockLoadConfig.mockResolvedValue(configWithBoth);

      // Mock writeFile to throw error only for sitemap
      mockWriteFile.mockImplementation((path: string) => {
        if (path.includes('sitemap.xml')) {
          return Promise.reject(new Error('Failed to write sitemap'));
        }
        return Promise.resolve();
      });

      // Should throw error when sitemap write fails
      await expect(build()).rejects.toThrow('Failed to write sitemap');
    });
  });

  describe('RSS Feed Generation', () => {
    beforeEach(() => {
      // Set environment to production for RSS generation
      setEnv('production');
    });

    it('should generate RSS feeds when enabled', async () => {
      const configWithRSS: StatiConfig = {
        ...mockConfig,
        rss: {
          enabled: true,
          feeds: [
            {
              filename: 'feed.xml',
              title: 'Test Feed',
              description: 'A test RSS feed',
              contentPatterns: ['site/**'],
            },
          ],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithRSS);

      await build();

      // Should write feed.xml
      const rssCall = mockWriteFile.mock.calls.find((call) => call[0].includes('feed.xml'));
      expect(rssCall).toBeDefined();
      expect(rssCall?.[0]).toMatch(/[/\\]test[/\\]project[/\\]dist[/\\]feed\.xml$/);
      expect(rssCall?.[1]).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssCall?.[1]).toContain('<rss version="2.0">');
      expect(rssCall?.[1]).toContain('<title>Test Feed</title>');
    });

    it('should not generate RSS feeds when disabled', async () => {
      const configWithoutRSS: StatiConfig = {
        ...mockConfig,
        rss: {
          enabled: false,
          feeds: [],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithoutRSS);

      await build();

      // Should not write any RSS files
      const rssCall = mockWriteFile.mock.calls.find((call) => call[0].includes('.xml'));
      expect(rssCall).toBeUndefined();
    });

    it('should handle RSS validation errors and not generate feeds', async () => {
      const configWithInvalidRSS: StatiConfig = {
        ...mockConfig,
        rss: {
          enabled: true,
          feeds: [
            {
              filename: 'feed.xml',
              title: '', // Invalid: empty title
              description: '', // Invalid: empty description
            } as RSSFeedConfig,
          ],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithInvalidRSS);

      const result = await build();

      // Should complete build despite invalid RSS config
      expect(result).toBeDefined();

      // Should not write RSS file due to validation errors
      const rssCall = mockWriteFile.mock.calls.find((call) => call[0].includes('feed.xml'));
      expect(rssCall).toBeUndefined();
    });

    it('should handle RSS validation warnings and still generate feeds', async () => {
      const configWithWarnings: StatiConfig = {
        ...mockConfig,
        rss: {
          enabled: true,
          feeds: [
            {
              filename: 'feed', // Warning: no .xml extension
              title: 'Test Feed',
              description: 'A test feed',
              ttl: 0, // Warning: ttl is 0
            },
          ],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithWarnings);

      await build();

      // Should still write RSS file despite warnings
      const rssCall = mockWriteFile.mock.calls.find((call) => call[0].includes('feed'));
      expect(rssCall).toBeDefined();
    });

    it('should handle empty pages array for RSS generation', async () => {
      const configWithRSS: StatiConfig = {
        ...mockConfig,
        rss: {
          enabled: true,
          feeds: [
            {
              filename: 'feed.xml',
              title: 'Test Feed',
              description: 'A test feed',
            },
          ],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithRSS);
      mockLoadContent.mockResolvedValue([]); // No pages

      await build();

      // Should complete - RSS feed might be written with 0 items
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should handle RSS generation errors gracefully', async () => {
      const configWithRSS: StatiConfig = {
        ...mockConfig,
        rss: {
          enabled: true,
          feeds: [
            {
              filename: 'feed.xml',
              title: 'Test Feed',
              description: 'A test feed',
              filter: () => {
                throw new Error('Filter function failed');
              },
            },
          ],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithRSS);

      // Build should complete despite RSS error
      const result = await build();
      expect(result).toBeDefined();
    });

    it('should generate multiple RSS feeds', async () => {
      const configWithMultipleFeeds: StatiConfig = {
        ...mockConfig,
        rss: {
          enabled: true,
          feeds: [
            {
              filename: 'blog.xml',
              title: 'Blog Feed',
              description: 'Blog posts feed',
              contentPatterns: ['site/blog/**'],
            },
            {
              filename: 'news.xml',
              title: 'News Feed',
              description: 'News feed',
              contentPatterns: ['site/news/**'],
            },
          ],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithMultipleFeeds);

      await build();

      // Should write both RSS files
      const blogCall = mockWriteFile.mock.calls.find((call) => call[0].includes('blog.xml'));
      const newsCall = mockWriteFile.mock.calls.find((call) => call[0].includes('news.xml'));

      expect(blogCall).toBeDefined();
      expect(newsCall).toBeDefined();
    });

    it('should not generate RSS feeds in development mode', async () => {
      // Set environment to development
      setEnv('development');

      const configWithRSS: StatiConfig = {
        ...mockConfig,
        rss: {
          enabled: true,
          feeds: [
            {
              filename: 'feed.xml',
              title: 'Test Feed',
              description: 'A test feed',
            },
          ],
        },
      };

      mockLoadConfig.mockResolvedValue(configWithRSS);

      await build();

      // Should not write RSS file in development mode
      const rssCall = mockWriteFile.mock.calls.find((call) => call[0].includes('feed.xml'));
      expect(rssCall).toBeUndefined();
    });
  });

  describe('TypeScript compilation', () => {
    beforeEach(() => {
      // Return array of bundle results
      mockCompileTypeScript.mockResolvedValue([
        {
          filename: 'main.js',
          path: '/_assets/main.js',
          config: { entryPoint: 'main.ts', bundleName: 'main' },
        },
      ]);
      mockAutoInjectBundles.mockImplementation((html) => html);
    });

    it('should compile TypeScript when enabled in config', async () => {
      const configWithTypeScript: StatiConfig = {
        ...mockConfig,
        typescript: {
          enabled: true,
        },
      };

      mockLoadConfig.mockResolvedValue(configWithTypeScript);

      await build();

      expect(mockCompileTypeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          config: { enabled: true },
          mode: 'development',
        }),
      );
    });

    it('should not compile TypeScript when disabled', async () => {
      mockLoadConfig.mockResolvedValue(mockConfig);

      await build();

      expect(mockCompileTypeScript).not.toHaveBeenCalled();
    });

    it('should inject bundle path into rendered HTML', async () => {
      const configWithTypeScript: StatiConfig = {
        ...mockConfig,
        typescript: {
          enabled: true,
        },
      };

      mockCompileTypeScript.mockResolvedValue([
        {
          filename: 'main-abc123.js',
          path: '/_assets/main-abc123.js',
          config: { entryPoint: 'main.ts', bundleName: 'main' },
        },
      ]);
      mockLoadConfig.mockResolvedValue(configWithTypeScript);

      await build();

      expect(mockAutoInjectBundles).toHaveBeenCalled();
    });

    it('should pass correct mode based on environment', async () => {
      const configWithTypeScript: StatiConfig = {
        ...mockConfig,
        typescript: {
          enabled: true,
        },
      };

      mockLoadConfig.mockResolvedValue(configWithTypeScript);

      // Test production mode
      setEnv('production');
      await build();

      expect(mockCompileTypeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'production',
        }),
      );
    });

    it('should pass assets to renderPage when bundle is generated', async () => {
      const configWithTypeScript: StatiConfig = {
        ...mockConfig,
        typescript: {
          enabled: true,
          outDir: '_assets',
        },
      };

      mockCompileTypeScript.mockResolvedValue([
        {
          filename: 'main-hash.js',
          path: '/_assets/main-hash.js',
          config: { entryPoint: 'main.ts', bundleName: 'main' },
        },
      ]);
      mockLoadConfig.mockResolvedValue(configWithTypeScript);

      await build();

      expect(mockRenderPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          bundlePaths: ['/_assets/main-hash.js'],
        }),
        expect.any(Array), // toc parameter
        expect.objectContaining({ error: expect.any(Function) }), // logger parameter
      );
    });

    it('should handle TypeScript compilation returning no bundle', async () => {
      const configWithTypeScript: StatiConfig = {
        ...mockConfig,
        typescript: {
          enabled: true,
        },
      };

      mockCompileTypeScript.mockResolvedValue([]); // Empty array - no bundles
      mockLoadConfig.mockResolvedValue(configWithTypeScript);

      await build();

      // Should pass undefined assets to renderPage when no bundles exist
      expect(mockRenderPage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
        expect.any(Array), // toc parameter
        expect.objectContaining({ error: expect.any(Function) }), // logger parameter
      );
    });
  });
});
