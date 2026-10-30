/**
 * Tests for the render session and the page loop without build(): what runs before the first
 * page renders, the inputs a page's cache hash covers, the tags a rendered page gets and the
 * pages the cache serves.
 * @module core/render-pages.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  computeRenderInputs,
  getPageOutput,
  postProcessHtml,
  prepareRenderSession,
  renderPages,
  type RenderSession,
} from '../../src/core/render-pages.js';
import { createMarkdownProcessor } from '../../src/core/markdown.js';
import { createTemplateEngine, type RenderResult } from '../../src/core/templates.js';
import { loadTemplateIndex } from '../../src/core/template-index.js';
import { StylesheetRuntime } from '../../src/css/runtime.js';
import { noopMetricRecorder } from '../../src/metrics/index.js';
import { setEnv } from '../../src/env.js';
import type { CompiledBundleInfo } from '../../src/core/utils/index.js';
import type { CacheManifest, Logger, PageModel, StatiConfig } from '../../src/types/index.js';

const LAYOUT =
  '<!DOCTYPE html><html><head><title><%= stati.page.title %></title></head><body><%~ stati.content %></body></html>';

function page(url: string, overrides: Partial<PageModel> = {}): PageModel {
  return {
    slug: url,
    url,
    sourcePath: `/site${url === '/' ? '/index' : url}.md`,
    frontMatter: { title: url },
    content: `# ${url}`,
    ...overrides,
  };
}

function renderResult(html: string, overrides: Partial<RenderResult> = {}): RenderResult {
  return {
    html,
    templatesLoaded: 1,
    templateRenders: 1,
    includeCacheHits: 0,
    failed: false,
    reads: { collection: false, nav: false },
    templates: [],
    templateLookups: [],
    ...overrides,
  };
}

describe('render pages', () => {
  let dir: string;
  let outDir: string;
  let logger: Logger;

  async function write(path: string, content: string): Promise<void> {
    const file = join(dir, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }

  /** A session for the pages, through prepareRenderSession like a build */
  async function session(
    pages: PageModel[],
    options: {
      config?: Partial<StatiConfig>;
      manifest?: CacheManifest;
      tailwind?: boolean;
      compiledBundles?: CompiledBundleInfo[];
      navigationHash?: string;
    } = {},
  ): Promise<RenderSession> {
    const config: StatiConfig = {
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      site: { title: 'Test', baseUrl: 'https://example.com' },
      ...options.config,
    };
    return prepareRenderSession({
      config,
      outDir,
      pages,
      manifest: options.manifest ?? { entries: {} },
      buildTime: new Date(),
      force: false,
      skipCacheUpdate: false,
      md: await createMarkdownProcessor(config),
      eta: createTemplateEngine(config),
      navigation: [],
      navigationHash: options.navigationHash ?? 'nav-1',
      templateIndex: await loadTemplateIndex(join(dir, 'site')),
      compiledBundles: options.compiledBundles ?? [],
      images: null,
      stylesheets: await StylesheetRuntime.create(config, {
        tailwind: options.tailwind
          ? { input: 'src/styles.css', output: 'dist/styles.css' }
          : undefined,
        outDir,
        cacheDir: join(dir, '.stati'),
        logger,
        recorder: noopMetricRecorder,
        development: true,
        projectRoot: dir,
      }),
      recorder: noopMetricRecorder,
      logger,
    });
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'stati-render-pages-'));
    outDir = join(dir, 'dist');
    vi.spyOn(process, 'cwd').mockReturnValue(dir);
    setEnv('development');
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
    await write('site/layout.eta', LAYOUT);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setEnv('development');
    await rm(dir, { recursive: true, force: true });
  });

  describe('prepareRenderSession', () => {
    it('runs beforeAll first, then fills in what the pages it added need', async () => {
      const pages = [page('/')];
      const beforeAll = vi.fn(({ pages: list }: { pages: PageModel[] }) => {
        list.push(page('/added', { content: 'one two three' }));
      });

      const result = await session(pages, { config: { hooks: { beforeAll } } });

      expect(beforeAll).toHaveBeenCalledWith({ config: result.config, pages });
      expect(pages[1]).toMatchObject({ url: '/added', wordCount: 3 });
      expect(result.pages).toBe(pages);
      expect(result).toMatchObject({
        basePath: '',
        searchIndexFilename: undefined,
        searchIndexPath: undefined,
        imageFingerprint: undefined,
      });
    });

    it('writes the search index before any page renders and links its path', async () => {
      const result = await session([page('/')], {
        config: {
          site: { title: 'Test', baseUrl: 'https://example.com/docs' },
          search: { enabled: true },
        },
      });

      expect(result.basePath).toBe('/docs');
      expect(result.searchIndexFilename).toMatch(/^search-index-[0-9a-f]+\.json$/);
      expect(result.searchIndexPath).toBe(`/${result.searchIndexFilename}`);
      expect(existsSync(join(outDir, result.searchIndexFilename!))).toBe(true);
    });

    it('hashes the URL list of a listing once for all its pages', async () => {
      const result = await session([page('/')]);
      const urls = ['/blog/', '/blog/page/2/'];

      expect(result.hashUrlList(urls)).toBe(result.hashUrlList(urls));
      expect(result.hashUrlList(urls)).toBe(result.hashUrlList([...urls]));
      expect(result.hashUrlList(urls)).not.toBe(result.hashUrlList(['/blog/']));
    });
  });

  describe('computeRenderInputs', () => {
    it("gives each page assets of its own with the build's bundles, stylesheet and search index", async () => {
      await write('src/styles.css', 'body{}');
      const bundle: CompiledBundleInfo = {
        config: { entryPoint: 'main.ts', bundleName: 'main' },
        filename: 'main-1234.js',
        path: '/_assets/main-1234.js',
      };
      const home = page('/');
      const result = await session([home], {
        config: { search: { enabled: true } },
        tailwind: true,
        compiledBundles: [bundle],
      });

      const first = computeRenderInputs(home, result);
      const second = computeRenderInputs(home, result);

      expect(first.assets).toEqual({
        bundlePaths: ['/_assets/main-1234.js'],
        stylesheetPaths: ['/styles.css'],
        searchIndexPath: result.searchIndexPath,
      });
      expect(second.assets.stylesheetPaths).not.toBe(first.assets.stylesheetPaths);
      expect(second.hashFor(undefined)).toBe(first.hashFor(undefined));
    });

    it('adds the collection summary and the navigation hash only for what the render read', async () => {
      const post = page('/blog/post');
      const pages = [page('/blog/', { sourcePath: '/site/blog/index.md' }), post];
      const result = await session(pages);
      const inputs = computeRenderInputs(post, result);
      const none = inputs.hashFor(undefined);

      expect(inputs.hashFor({ collection: false, nav: false })).toBe(none);
      expect(inputs.hashFor({ collection: true, nav: false })).not.toBe(none);
      expect(inputs.hashFor({ collection: false, nav: true })).not.toBe(none);

      const otherNav = computeRenderInputs(post, { ...result, navigationHash: 'nav-2' });
      expect(otherNav.hashFor({ collection: true, nav: false })).toBe(
        inputs.hashFor({ collection: true, nav: false }),
      );
      expect(otherNav.hashFor({ collection: false, nav: true })).not.toBe(
        inputs.hashFor({ collection: false, nav: true }),
      );
    });

    it('hashes a missing collection as none for a page that reads it', async () => {
      const generated = page('/tags/a', {
        generated: { key: 'a', label: 'A', template: '/site/tags/[tag].md', items: [] },
      });
      const result = await session([generated]);
      const inputs = computeRenderInputs(generated, result);

      expect(inputs.hashFor({ collection: true, nav: false })).not.toBe(inputs.hashFor(undefined));
    });

    it("covers a page's word count, its pagination slice, generated items and the 404 page", async () => {
      const result = await session([page('/')]);
      const hash = (target: PageModel) => computeRenderInputs(target, result).hashFor(undefined);
      const base = hash(page('/a'));

      expect(hash(page('/a', { wordCount: 10, readingTime: 1 }))).not.toBe(base);
      expect(hash(page('/404'))).not.toBe(hash(page('/405')));
      expect(
        hash(
          page('/a', {
            pagination: { pageNumber: 1, totalPages: 2, urls: ['/a', '/a/2'], items: [] },
          } as Partial<PageModel>),
        ),
      ).not.toBe(base);

      const generated = (data: unknown) =>
        page('/a', {
          generated: { key: 'a', label: 'A', template: '/site/[tag].md', items: [], data },
        } as Partial<PageModel>);
      expect(hash(generated({ count: 1 }))).toBe(hash(generated({ count: 1 })));
      expect(hash(generated({ count: 1 }))).not.toBe(hash(generated({ count: 2 })));
      // Data that can't be serialized never matches, so the page rebuilds
      expect(hash(generated({ count: 1n }))).not.toBe(hash(generated({ count: 1n })));
    });

    it('covers the base path, the stylesheet and the auto-inject settings', async () => {
      const home = page('/');
      const hash = async (options: Parameters<typeof session>[1]) =>
        computeRenderInputs(home, await session([home], options)).hashFor(undefined);
      const base = await hash({});

      expect(
        await hash({ config: { site: { title: 'Test', baseUrl: 'https://example.com/sub' } } }),
      ).not.toBe(base);
      expect(await hash({ tailwind: true })).not.toBe(base);
      expect(
        await hash({ config: { typescript: { enabled: false, autoInject: false } } }),
      ).not.toBe(base);
    });
  });

  describe('postProcessHtml', () => {
    const html =
      '<!DOCTYPE html><html><head><title>Home</title></head><body><h1>Home</h1></body></html>';

    it('adds the SEO tags, the search meta tag, the stylesheet link and the bundle scripts, in that order', async () => {
      const home = page('/');
      const result = await session([home], {
        config: { search: { enabled: true } },
        tailwind: true,
      });
      const assets = {
        bundlePaths: ['/_assets/main.js'],
        stylesheetPaths: ['/styles.css'],
      };

      const final = await postProcessHtml(home, renderResult(html), assets, result);

      const positions = [
        final.indexOf('<meta property="og:title"'),
        final.indexOf('<meta name="stati:search-index"'),
        final.indexOf('<link rel="stylesheet" href="/styles.css">'),
        final.indexOf('<script type="module" src="/_assets/main.js"'),
      ];
      expect(positions.every((position) => position > 0)).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      expect(final).toContain(`content="${result.searchIndexPath}"`);
    });

    it('leaves the page alone when every autoInject setting is off', async () => {
      const home = page('/');
      const result = await session([home], {
        config: {
          seo: { autoInject: false },
          search: { enabled: true, autoInjectMetaTag: false },
          typescript: { enabled: false, autoInject: false },
          css: { autoInject: false },
        },
        tailwind: true,
      });
      const assets = { bundlePaths: ['/_assets/main.js'], stylesheetPaths: ['/styles.css'] };

      expect(await postProcessHtml(home, renderResult(html), assets, result)).toBe(html);
    });

    it("passes the page's Open Graph image and seo.debug to the SEO tags", async () => {
      const home = page('/');
      const result = await session([home], { config: { seo: { debug: true } } });
      const ogImage = {
        url: 'https://example.com/_img/og/home.png',
        path: '/_img/og/home.png',
        width: 1200,
        height: 630,
      };

      const final = await postProcessHtml(
        home,
        renderResult(html, { ogImage }),
        { bundlePaths: [], stylesheetPaths: [] },
        result,
      );

      expect(final).toContain('content="https://example.com/_img/og/home.png"');
      expect(logger.warning).toHaveBeenCalledWith(expect.stringContaining('[SEO Auto-Inject]'));
    });
  });

  describe('getPageOutput', () => {
    it("gives a page's output file and cache key", () => {
      expect(getPageOutput(page('/blog/'), outDir)).toEqual({
        outputPath: join(outDir, 'blog', 'index.html'),
        cacheKey: '/blog/index.html',
      });
    });

    it('fails for a page whose file would be outside the output directory', () => {
      expect(() => getPageOutput(page('/../escape'), outDir)).toThrow(
        'The page /../escape (/site/../escape.md) would be written outside the output directory',
      );
    });
  });

  describe('renderPages', () => {
    it("renders the pages the cache can't serve with their hooks, and serves the rest", async () => {
      setEnv('production');
      const calls: string[] = [];
      const progress = {
        startProgress: vi.fn(),
        updateProgress: vi.fn(),
        endProgress: vi.fn(),
        showRenderingSummary: vi.fn(),
      };
      Object.assign(logger, progress);
      const config: Partial<StatiConfig> = {
        isg: { enabled: true, ttlSeconds: 3600 },
        hooks: {
          beforeRender: async ({ page: rendered }) => {
            calls.push(`before ${rendered.url}`);
          },
          afterRender: async ({ page: rendered }) => {
            calls.push(`after ${rendered.url}`);
          },
        },
      };
      const manifest: CacheManifest = { entries: {} };

      const first = await renderPages(
        await session([page('/'), page('/about')], { config, manifest }),
      );

      expect(first).toEqual({
        cacheHits: 0,
        cacheMisses: 2,
        renderedFiles: [join(outDir, 'index.html'), join(outDir, 'about.html')],
      });
      expect(calls).toEqual(['before /', 'after /', 'before /about', 'after /about']);
      expect(await readFile(join(outDir, 'about.html'), 'utf-8')).toContain('<h1');
      expect(Object.keys(manifest.entries).sort()).toEqual(['/about.html', '/index.html']);
      expect(progress.startProgress).toHaveBeenCalledWith(2);
      expect(progress.updateProgress).toHaveBeenCalledWith('rendered', '/', expect.any(Number));

      calls.length = 0;
      const second = await renderPages(
        await session([page('/'), page('/about')], { config, manifest }),
      );

      expect(second).toEqual({ cacheHits: 2, cacheMisses: 0, renderedFiles: [] });
      expect(calls).toEqual([]);
      expect(progress.updateProgress).toHaveBeenCalledWith('cached', '/about');
      expect(progress.endProgress).toHaveBeenCalledTimes(2);
      expect(progress.showRenderingSummary).toHaveBeenCalledTimes(2);
    });
  });
});
