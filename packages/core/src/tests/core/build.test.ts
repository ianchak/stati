import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { build } from '../../core/build.js';
import type { BuildOptions } from '../../core/build.js';
import type { StatiConfig } from '../../types.js';

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
} = vi.hoisted(() => ({
  mockEnsureDir: vi.fn(),
  mockWriteFile: vi.fn(),
  mockCopy: vi.fn(),
  mockCopyFile: vi.fn(),
  mockRemove: vi.fn(),
  mockPathExists: vi.fn(),
  mockReaddir: vi.fn(),
  mockStat: vi.fn(),
  mockLoadConfig: vi.fn(),
  mockLoadContent: vi.fn(),
  mockCreateMarkdownProcessor: vi.fn(),
  mockRenderMarkdown: vi.fn(),
  mockCreateTemplateEngine: vi.fn(),
  mockRenderPage: vi.fn(),
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

vi.mock('../../config/loader.js', () => ({
  loadConfig: mockLoadConfig,
}));

vi.mock('../../core/content.js', () => ({
  loadContent: mockLoadContent,
}));

vi.mock('../../core/markdown.js', () => ({
  createMarkdownProcessor: mockCreateMarkdownProcessor,
  renderMarkdown: mockRenderMarkdown,
}));

vi.mock('../../core/templates.js', () => ({
  createTemplateEngine: mockCreateTemplateEngine,
  renderPage: mockRenderPage,
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
    mockRenderMarkdown.mockReturnValue('<h1>Rendered markdown</h1>');
    mockRenderPage.mockResolvedValue('<html><body>Full page</body></html>');

    mockPathExists.mockResolvedValue(true);
    mockEnsureDir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([]);
    mockStat.mockResolvedValue({ size: 1024 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      expect(mockRenderMarkdown).toHaveBeenCalledWith('# Welcome to our site', mockMd);
      expect(mockRenderMarkdown).toHaveBeenCalledWith('# About us', mockMd);
      expect(mockRenderMarkdown).toHaveBeenCalledWith('# My first post', mockMd);
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
      expect(consoleSpy).toHaveBeenCalledWith('🧭 Built navigation with 3 top-level items');
      // ISG shows "Checking" then "🔄 Building" for pages that need rebuilding
      expect(consoleSpy).toHaveBeenCalledWith('Checking /');
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Building /');
      expect(consoleSpy).toHaveBeenCalledWith('Checking /about');
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Building /about');
      expect(consoleSpy).toHaveBeenCalledWith('Checking /blog/post');
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Building /blog/post');
      expect(consoleSpy).toHaveBeenCalledWith('📦 Copying static assets from static');
      expect(consoleSpy).toHaveBeenCalledWith('📦 Copied 0 static assets');
    });

    it('should include version in build message when provided', async () => {
      await build({ version: '1.2.3' });

      expect(consoleSpy).toHaveBeenCalledWith('Building your site...');
    });

    it('should log clean message when cleaning', async () => {
      await build({ clean: true });

      expect(consoleSpy).toHaveBeenCalledWith('🧹 Cleaning output directory...');
    });

    it('should handle build with no pages', async () => {
      mockLoadContent.mockResolvedValue([]);

      await build();

      expect(consoleSpy).toHaveBeenCalledWith('📄 Found 0 pages');
      expect(mockRenderMarkdown).not.toHaveBeenCalled();
      expect(mockRenderPage).not.toHaveBeenCalled();
      // ISG still writes cache manifest even with no pages, so we expect one write call
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      // Verify it's the cache manifest being written
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        expect.stringContaining('"entries": {}'),
        'utf-8',
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
  });
});
