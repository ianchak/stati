import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTemplateEngine,
  clearTemplateEngineCache,
  renderPage,
} from '../../src/core/templates.js';
import { TemplateIndex } from '../../src/core/template-index.js';
import type { StatiConfig, PageModel, Logger } from '../../src/types/index.js';
import type { Eta } from 'eta';
import { join } from 'node:path';

// Create hoisted mocks
const { MockEta, mockIsDevelopment, mockIsProduction } = vi.hoisted(() => ({
  MockEta: vi.fn(),
  mockIsDevelopment: vi.fn(),
  mockIsProduction: vi.fn(),
}));

vi.mock('eta', () => ({
  Eta: MockEta,
  EtaParseError: class EtaParseError extends Error {},
}));

vi.mock('../../src/env.js', () => ({
  isDevelopment: () => mockIsDevelopment(),
  isProduction: () => mockIsProduction(),
}));

describe('templates.ts', () => {
  const mockConfig: StatiConfig = {
    srcDir: 'src',
    outDir: 'dist',
    staticDir: 'static',
    site: {
      title: 'Test Site',
      baseUrl: 'https://example.com',
    },
  };

  const mockProjectRoot = join('test', 'project');
  const srcDir = join(mockProjectRoot, 'src');

  const mockPage: PageModel = {
    slug: '/test-page',
    url: '/test-page',
    sourcePath: join(srcDir, 'test-page.md'),
    frontMatter: {
      title: 'Test Page',
      description: 'A test page',
    },
    content: '# Test content',
  };

  let mockEtaInstance: {
    renderAsync: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
    compileToString: ReturnType<typeof vi.fn>;
  };

  let logger: Record<
    'info' | 'success' | 'warning' | 'error' | 'status' | 'building' | 'processing' | 'stats',
    ReturnType<typeof vi.fn>
  >;

  /** Renders a page with the given templates in the source directory */
  function render(
    page: PageModel,
    templates: string[],
    options: { config?: StatiConfig; allPages?: PageModel[] } = {},
  ) {
    return renderPage(
      page,
      '<h1>Test content</h1>',
      options.config ?? mockConfig,
      mockEtaInstance as unknown as Eta,
      undefined,
      options.allPages,
      undefined,
      undefined,
      logger as unknown as Logger,
      { templateIndex: new TemplateIndex(srcDir, templates) },
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue(mockProjectRoot);
    clearTemplateEngineCache();
    mockIsDevelopment.mockReturnValue(false);
    mockIsProduction.mockReturnValue(true);

    mockEtaInstance = {
      renderAsync: vi.fn().mockResolvedValue('<html>Rendered content</html>'),
      render: vi.fn().mockReturnValue(''),
      compileToString: vi.fn().mockReturnValue(''),
    };
    MockEta.mockImplementation(function () {
      return mockEtaInstance;
    });
    logger = {
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      status: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };
  });

  describe('createTemplateEngine', () => {
    it("creates Eta with stati as its variable and Stati's plugin", () => {
      const eta = createTemplateEngine(mockConfig);

      expect(MockEta).toHaveBeenCalledWith({
        views: join(mockProjectRoot, 'src'),
        cache: true,
        cacheFilepaths: true,
        varName: 'stati',
        debug: false,
        plugins: [
          expect.objectContaining({
            processAST: expect.any(Function),
            processFnString: expect.any(Function),
          }),
        ],
      });
      expect(eta).toBe(mockEtaInstance);
      // The plugin is checked against the installed Eta when the engine is created
      expect(mockEtaInstance.compileToString).toHaveBeenCalledWith('', { async: false });
    });

    it('turns on debug mode in development, for the error overlay', () => {
      mockIsDevelopment.mockReturnValue(true);
      mockIsProduction.mockReturnValue(false);
      createTemplateEngine(mockConfig);

      expect(MockEta).toHaveBeenCalledWith(expect.objectContaining({ debug: true, cache: true }));
    });

    it('should reuse cached Eta instance in development for the same template directory', () => {
      mockIsDevelopment.mockReturnValue(true);

      const firstEta = createTemplateEngine(mockConfig);
      const secondEta = createTemplateEngine(mockConfig);

      expect(MockEta).toHaveBeenCalledTimes(1);
      expect(secondEta).toBe(firstEta);
    });

    it('fails when the plugin does not recognize the installed Eta', () => {
      mockEtaInstance.compileToString.mockImplementation(() => {
        throw new Error("Stati could not find Eta's layout() function");
      });

      expect(() => createTemplateEngine(mockConfig)).toThrow("could not find Eta's layout()");
    });
  });

  describe('renderPage', () => {
    it('renders the discovered layout with the page context', async () => {
      const result = await render(mockPage, ['layout.eta']);

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'layout.eta',
        expect.objectContaining({
          content: '<h1>Test content</h1>',
          page: expect.objectContaining({
            title: 'Test Page',
            description: 'A test page',
            path: '/test-page',
            content: '<h1>Test content</h1>',
            toc: [],
          }),
          site: { title: 'Test Site', baseUrl: 'https://example.com' },
          props: undefined,
          helpers: {},
          include: expect.any(Function),
          layout: expect.any(Function),
        }),
      );
      expect(result.html).toBe('<html>Rendered content</html>');
      expect(result.templatesLoaded).toBe(1);
      expect(result.templates).toEqual([`${srcDir.replace(/\\/g, '/')}/layout.eta`]);
      expect(result.templateLookups).toEqual([{ name: 'layout', from: '', file: 'layout.eta' }]);
    });

    it("leaves stati.body out of the page's layout", async () => {
      await render(mockPage, ['layout.eta']);
      const context = mockEtaInstance.renderAsync.mock.calls[0]![1] as Record<string, unknown>;

      expect('body' in context).toBe(false);
      expect(Object.keys(context).sort()).toEqual([
        'assets',
        'collection',
        'content',
        'generateSEO',
        'generated',
        'generator',
        'helpers',
        'image',
        'include',
        'layout',
        'nav',
        'og',
        'ogImage',
        'page',
        'pagination',
        'propValue',
        'props',
        'site',
        'slugify',
        'url',
      ]);
    });

    it('renders the layout named in front matter, by the name lookup', async () => {
      const page = { ...mockPage, frontMatter: { ...mockPage.frontMatter, layout: 'custom' } };
      await render(page, ['layout.eta', 'custom.eta']);

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'custom.eta',
        expect.objectContaining({ page: expect.objectContaining({ layout: 'custom' }) }),
      );
      expect(logger.warning).not.toHaveBeenCalled();
    });

    it('warns when the front matter layout names no template, then uses discovery', async () => {
      const page = { ...mockPage, frontMatter: { ...mockPage.frontMatter, layout: 'artcle' } };
      await render(page, ['layout.eta', 'article.eta']);

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith('layout.eta', expect.any(Object));
      expect(logger.warning).toHaveBeenCalledWith(
        'src/test-page.md: front matter layout "artcle" names no template; using src/layout.eta. Did you mean "article"?',
      );
    });

    it('warns without suggestions when no template is close to the front matter layout', async () => {
      const page = { ...mockPage, frontMatter: { ...mockPage.frontMatter, layout: 'qwxz' } };
      await render(page, ['layout.eta', 'article.eta']);

      expect(logger.warning).toHaveBeenCalledWith(
        'src/test-page.md: front matter layout "qwxz" names no template; using src/layout.eta.',
      );
    });

    it('looks a front matter layout up from the page folder, so a section file wins', async () => {
      const page: PageModel = {
        ...mockPage,
        sourcePath: join(srcDir, 'posts', 'index.md'),
        frontMatter: { title: 'Posts', layout: 'layout' },
      };
      await render(page, ['layout.eta', 'posts/layout.eta']);
      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'posts/layout.eta',
        expect.any(Object),
      );

      await render({ ...page, frontMatter: { layout: '/layout' } }, [
        'layout.eta',
        'posts/layout.eta',
      ]);
      expect(mockEtaInstance.renderAsync).toHaveBeenLastCalledWith(
        'layout.eta',
        expect.any(Object),
      );
      expect(logger.warning).not.toHaveBeenCalled();
    });

    it("discovers the nearest layout.eta from the page's folder", async () => {
      const deepPage = { ...mockPage, sourcePath: join(srcDir, 'blog', 'tech', 'js', 'post.md') };
      await render(deepPage, ['layout.eta', 'blog/layout.eta']);

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'blog/layout.eta',
        expect.any(Object),
      );
    });

    it('uses index.eta for collection index pages', async () => {
      const blogIndex = { ...mockPage, url: '/blog', sourcePath: join(srcDir, 'blog', 'index.md') };
      const post = { ...mockPage, url: '/blog/post', sourcePath: join(srcDir, 'blog', 'post.md') };
      await render(blogIndex, ['layout.eta', 'blog/index.eta'], { allPages: [blogIndex, post] });

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'blog/index.eta',
        expect.any(Object),
      );
    });

    it('uses the fallback HTML when no layout exists, recording the misses', async () => {
      const result = await render(mockPage, ['partials/header.eta']);

      expect(logger.warning).toHaveBeenCalledWith('No layout template found, using fallback');
      expect(result.html).toContain('<h1>Test content</h1>');
      expect(result.html).toContain('<title>Test Page</title>');
      expect(result.templatesLoaded).toBe(0);
      expect(result.templateLookups).toEqual([{ name: 'layout', from: '', file: null }]);
    });

    it('logs a layout that fails in production and returns the fallback HTML', async () => {
      mockEtaInstance.renderAsync.mockRejectedValue(new Error('Template error'));

      const result = await render(mockPage, ['layout.eta']);

      expect(logger.error).toHaveBeenCalledWith(
        'Error rendering src/layout.eta for /test-page: Template error',
      );
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<title>Test Page</title>');
      // The failing layout is recorded, so fixing it rebuilds the page
      expect(result.templatesLoaded).toBe(1);
      expect(result.templates).toEqual([`${srcDir.replace(/\\/g, '/')}/layout.eta`]);
      expect(result.failed).toBe(true);
    });

    it('does not report a failure for a page that renders', async () => {
      mockEtaInstance.renderAsync.mockResolvedValue('<html></html>');

      const result = await render(mockPage, ['layout.eta']);

      expect(result.failed).toBe(false);
    });

    it('throws a template error for the overlay in development', async () => {
      mockIsDevelopment.mockReturnValue(true);
      mockIsProduction.mockReturnValue(false);
      mockEtaInstance.renderAsync.mockRejectedValue(new Error('Template error'));

      await expect(render(mockPage, ['layout.eta'])).rejects.toMatchObject({
        name: 'TemplateError',
        message: 'Template error',
        filePath: join(srcDir, 'layout.eta'),
      });
    });

    it('should pass TOC entries to template context', async () => {
      const toc = [
        { id: 'introduction', text: 'Introduction', level: 2 },
        { id: 'installation', text: 'Installation', level: 3 },
      ];

      await renderPage(
        mockPage,
        '<h1>Test content</h1>',
        mockConfig,
        mockEtaInstance as unknown as Eta,
        undefined,
        undefined,
        undefined,
        toc,
        logger as unknown as Logger,
        { templateIndex: new TemplateIndex(srcDir, ['layout.eta']) },
      );

      expect(mockEtaInstance.renderAsync).toHaveBeenCalledWith(
        'layout.eta',
        expect.objectContaining({ page: expect.objectContaining({ toc }) }),
      );
    });

    it('reads the template index from the source directory when none is passed', async () => {
      const result = await renderPage(
        mockPage,
        '<p>x</p>',
        { ...mockConfig, srcDir: 'no-such-folder' },
        mockEtaInstance as unknown as Eta,
        undefined,
        undefined,
        undefined,
        undefined,
        logger as unknown as Logger,
      );

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(mockEtaInstance.renderAsync).not.toHaveBeenCalled();
    });

    describe('helpers', () => {
      it('puts the config helpers under stati.helpers, never on the root', async () => {
        const formatDate = () => 'today';
        const page = vi.fn(() => 'a helper named page');
        await render(mockPage, ['layout.eta'], {
          config: { ...mockConfig, helpers: { formatDate, page, image: page } },
        });
        const context = mockEtaInstance.renderAsync.mock.calls[0]![1] as Record<string, unknown>;

        expect(context.helpers).toEqual({ formatDate, page, image: page });
        expect(context.formatDate).toBeUndefined();
        // Helpers named like Stati's own keys leave those alone
        expect(context.page).toMatchObject({ title: 'Test Page' });
        expect(typeof context.image).toBe('function');
        expect(context.image).not.toBe(page);
      });

      it('gives each page its own copy of the helpers object', async () => {
        const helpers = { formatDate: () => 'today' };
        await render(mockPage, ['layout.eta'], { config: { ...mockConfig, helpers } });
        const context = mockEtaInstance.renderAsync.mock.calls[0]![1] as Record<string, unknown>;

        expect(context.helpers).not.toBe(helpers);
        (context.helpers as Record<string, unknown>).formatDate = () => 'replaced';
        expect(helpers.formatDate()).toBe('today');
      });
    });

    describe('shared data the render reads', () => {
      const blogIndex: PageModel = {
        slug: '/blog',
        url: '/blog',
        sourcePath: join(srcDir, 'blog', 'index.md'),
        frontMatter: { title: 'Blog' },
        content: '',
      };
      const post: PageModel = {
        slug: '/blog/post',
        url: '/blog/post',
        sourcePath: join(srcDir, 'blog', 'post.md'),
        frontMatter: { title: 'Post' },
        content: '',
      };
      const allPages = [blogIndex, post];
      const navigation = [{ title: 'Post', url: '/blog/post', path: '/blog/post' }];

      /** Renders the post with a layout that runs `read` on the template context */
      async function renderWith(
        read: (context: Record<string, unknown>) => unknown,
        page: PageModel = post,
      ) {
        let seen: Record<string, unknown> = {};
        mockEtaInstance.renderAsync.mockImplementation(async (_path, context) => {
          seen = context as Record<string, unknown>;
          return `<html>${String(read(seen) ?? '')}</html>`;
        });
        const result = await renderPage(
          page,
          '<p>Body</p>',
          mockConfig,
          mockEtaInstance as unknown as Eta,
          navigation,
          allPages,
          undefined,
          undefined,
          logger as unknown as Logger,
          { templateIndex: new TemplateIndex(srcDir, ['layout.eta']) },
        );
        return { result, context: seen };
      }

      it('reports no reads for a layout that reads neither', async () => {
        const { result } = await renderWith((context) => (context.page as { title: string }).title);
        expect(result.reads).toEqual({ collection: false, nav: false });
      });

      it('reports a collection read when a template reads stati.collection', async () => {
        const { result } = await renderWith(
          (context) => (context.collection as { pages: PageModel[] }).pages.length,
        );
        expect(result.reads).toEqual({ collection: true, nav: false });
      });

      it('reports a navigation read for stati.nav and stati.page.navNode', async () => {
        const viaHelpers = await renderWith(
          (context) => (context.nav as { getTree: () => unknown[] }).getTree().length,
        );
        expect(viaHelpers.result.reads.nav).toBe(true);

        const viaNode = await renderWith(
          (context) => (context.page as { navNode?: { title: string } }).navNode?.title,
        );
        expect(viaNode.result.reads.nav).toBe(true);
      });

      it('counts replacing a navigation helper as a read and keeps the replacement', async () => {
        const replaced = await renderWith((context) => {
          (context.nav as { getTree: () => unknown[] }).getTree = () => [];
          return 'replaced';
        });
        expect(replaced.result.reads.nav).toBe(true);

        const reread = await renderWith((context) => {
          const nav = context.nav as { getTree: () => unknown[] };
          nav.getTree = () => [];
          return nav.getTree().length;
        });
        expect(reread.result.html).toBe('<html>0</html>');
      });

      it('does not count spreading the context, as includes do, as a read', async () => {
        const { result } = await renderWith((context) => Object.keys({ ...context }).length);
        expect(result.reads).toEqual({ collection: false, nav: false });
      });

      it('passes copies of the pagination and generated data, and slugify', async () => {
        const pagination = {
          pageNumber: 1,
          totalPages: 1,
          items: [post],
          urls: ['/blog'],
        };
        const listing: PageModel = { ...blogIndex, pagination };
        const { context } = await renderWith(
          (ctx) => (ctx.pagination as { items: PageModel[] }).items.reverse().length,
          listing,
        );

        expect(context.pagination).toEqual(pagination);
        expect(context.pagination).not.toBe(pagination);
        expect(context.generated).toBeUndefined();
        expect((context.slugify as (text: string) => string)('Hello World')).toBe('hello-world');
      });
    });
  });
});
