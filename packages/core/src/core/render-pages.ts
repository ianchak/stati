/**
 * Renders a build's pages: what runs before the first page renders, the inputs each page's
 * cache hash covers, the tags and links a rendered page gets after its template, and the loop
 * that renders the pages the cache can't serve.
 * @module core/render-pages
 */

import { join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { MarkdownIt } from 'markdown-it';
import {
  autoInjectBundles,
  getBasePath,
  getBundlePathsForPage,
  getPageOutputFile,
  isNotFoundPage,
  isPathWithinDirectory,
  pathExists,
} from './utils/index.js';
import type { CompiledBundleInfo } from './utils/index.js';
import { fillTextStats } from './reading-time.js';
import {
  createSummaryHasher,
  resolveCollectionPath,
  resolveSummaryFields,
  type PageReads,
  type SummaryHasher,
} from './collections.js';
import { extractToc, renderMarkdown } from './markdown.js';
import { renderPage, type createTemplateEngine, type RenderResult } from './templates.js';
import type { TemplateIndex } from './template-index.js';
import { BasePathLinkReport } from './base-path-links.js';
import {
  computeContentHash,
  hasRecordedReads,
  shouldRebuildPage,
  type RenderedAssets,
} from './isg/index.js';
import { createPageWriter } from './page-writer.js';
import {
  applySEODefaults,
  autoInjectSEO,
  refreshSEODefaults,
  type AutoInjectOptions,
} from '../seo/index.js';
import {
  autoInjectSearchMeta,
  computeSearchIndexFilename,
  generateSearchIndex,
  isGeneratedPageExcludedFromSearch,
  writeSearchIndex,
} from '../search/index.js';
import { isDevelopment } from '../env.js';
import type { ImageRuntime } from '../images/runtime.js';
import type { StylesheetRuntime } from '../css/runtime.js';
import type { MetricRecorder } from '../metrics/index.js';
import type {
  BuildContext,
  CacheManifest,
  Logger,
  NavNode,
  PageModel,
  StatiAssets,
  StatiConfig,
  TocEntry,
} from '../types/index.js';

/** The build-wide values pages render with, which {@link prepareRenderSession} completes */
export interface RenderSessionOptions {
  config: StatiConfig;
  /** The output directory, absolute */
  outDir: string;
  /** Every page of the build; the `beforeAll` hook can change the list */
  pages: PageModel[];
  manifest: CacheManifest;
  /** When this build renders, recorded in the cache entries */
  buildTime: Date;
  /** Render every page, whatever the cache holds (`BuildOptions.force`) */
  force: boolean;
  /** Leave the cache entries of rendered pages alone (`BuildOptions.skipCacheUpdate`) */
  skipCacheUpdate: boolean;
  md: MarkdownIt;
  eta: ReturnType<typeof createTemplateEngine>;
  navigation: NavNode[];
  /** The navigation tree's hash, in the render inputs of pages that read the navigation */
  navigationHash: string;
  /** Every template under the source directory */
  templateIndex: TemplateIndex;
  compiledBundles: CompiledBundleInfo[];
  /** The image pipeline; null with `images: false` */
  images: ImageRuntime | null;
  stylesheets: StylesheetRuntime;
  recorder: MetricRecorder;
  logger: Logger;
}

/** The values every page renders with, from the pages as the `beforeAll` hook left them */
export interface RenderSession extends RenderSessionOptions {
  /** The path the site is served from, which every root-relative URL core emits starts with */
  basePath: string;
  /** Collection summaries, hashed after `beforeAll`, which can change front matter */
  summaries: SummaryHasher;
  /** The search index file the pages link to; undefined when search is disabled */
  searchIndexFilename: string | undefined;
  /** The index's path from the site root (`stati.assets.searchIndexPath`) */
  searchIndexPath: string | undefined;
  /** Image settings that change generated HTML; undefined with `images: false` */
  imageFingerprint: Record<string, unknown> | undefined;
  /** Hashes the page URLs of a listing, which its pages share, once for all of them */
  hashUrlList(urls: readonly string[]): string;
}

/** What a page renders with, and the hash its cache entry gets for what the render read */
export interface PageRenderInputs {
  /** The page's `stati.assets`, a copy of its own, so a template that changes it changes only its page */
  assets: StatiAssets;
  /** The render-inputs hash, with the collection summary and navigation hash a render read */
  hashFor(reads: PageReads | undefined): string;
}

/** What {@link renderPages} rendered */
export interface RenderPagesResult {
  cacheHits: number;
  cacheMisses: number;
  /** The output files of the pages this build rendered, written or held */
  renderedFiles: string[];
}

/**
 * Searchable page data collected during build for search index generation.
 */
interface SearchablePageData {
  page: PageModel;
  toc: TocEntry[];
  markdownContent: string;
}

/**
 * Generates the search index from the page models and writes it before any page renders,
 * returning the file name pages link to. Every page links to the index, and the name is part
 * of each page's cache hash, so a production build names a hashed file after the index
 * content: a build that leaves the indexed text alone keeps the name and its cached pages.
 * Development keeps one name, so a content edit does not re-render every page. Writing the
 * index first means it is not held in memory while the pages render.
 *
 * @returns The index file name, or undefined when search is disabled
 */
async function writeSearchIndexBeforeRendering(
  pages: PageModel[],
  config: StatiConfig,
  md: MarkdownIt,
  outDir: string,
  logger: Logger,
  recorder: MetricRecorder,
): Promise<string | undefined> {
  if (config.search?.enabled !== true) {
    return undefined;
  }
  const isDevMode = isDevelopment();

  const endSearchIndexSpan = recorder.startSpan('searchIndexGenerationMs');
  // TOC entries and markdown content, the same data a render produces, without rendering.
  // Sorted by URL, so the index content, and with it the name, changes only when pages do.
  const tocEnabled = config.markdown?.toc !== false;
  const byUrl = (a: PageModel, b: PageModel) =>
    a.url.localeCompare(b.url) || a.sourcePath.localeCompare(b.sourcePath);
  const searchablePages: SearchablePageData[] = pages
    .filter((page) => !isGeneratedPageExcludedFromSearch(page))
    .sort(byUrl)
    .map((page) => ({
      page,
      toc: tocEnabled ? extractToc(page.content, md) : [],
      markdownContent: page.content,
    }));
  const basePath = getBasePath(config.site.baseUrl);
  const index = generateSearchIndex(searchablePages, config.search, logger, basePath);

  // A production hash covers the documents, base path and schema version, not generatedAt,
  // which changes on every build; serializing them is skipped when the name has no hash
  const hashInput = isDevMode
    ? 'dev'
    : config.search.hashFilename !== false
      ? JSON.stringify({ version: index.version, basePath, documents: index.documents })
      : undefined;
  const filename = computeSearchIndexFilename(config.search, hashInput);
  endSearchIndexSpan();

  // Pages still link to the name when nothing is searchable, but no file is written
  if (searchablePages.length === 0) {
    return filename;
  }

  logger.info('');
  logger.info(`Generating search index to ${filename}`);
  const writeStart = performance.now();
  // In dev mode, skip write if content hasn't changed (template-only changes)
  const metadata = await writeSearchIndex(index, outDir, filename, isDevMode);
  recorder.recordPhase('searchIndexWriteMs', performance.now() - writeStart);
  logger.success(`Generated search index with ${metadata.documentCount} documents`);

  return filename;
}

/**
 * Runs what comes before the first page renders, in this order: the `beforeAll` hook, then for
 * the pages it leaves the word counts of pages it added, the site-wide SEO defaults, the
 * collection summaries and the search index, which is written now. The SEO defaults go into
 * front matter, which each page's cache hash covers, so changing one rebuilds the pages it
 * changes; values the hook set win.
 *
 * @param options - The build-wide values
 * @returns The session the pages render with
 */
export async function prepareRenderSession(options: RenderSessionOptions): Promise<RenderSession> {
  const { config, pages, md, outDir, logger, recorder } = options;

  if (config.hooks?.beforeAll) {
    const buildContext: BuildContext = { config, pages };
    const endHookBeforeAll = recorder.startSpan('hookBeforeAllMs');
    await config.hooks.beforeAll(buildContext);
    endHookBeforeAll();
  }

  fillTextStats(pages, config);
  applySEODefaults(pages, config, logger);
  const summaries = createSummaryHasher(pages, resolveSummaryFields(config));
  const searchIndexFilename = await writeSearchIndexBeforeRendering(
    pages,
    config,
    md,
    outDir,
    logger,
    recorder,
  );

  const urlListHashes = new WeakMap<readonly string[], string>();
  return {
    ...options,
    basePath: getBasePath(config.site.baseUrl),
    summaries,
    searchIndexFilename,
    searchIndexPath: searchIndexFilename ? `/${searchIndexFilename}` : undefined,
    imageFingerprint: options.images?.fingerprint(),
    hashUrlList(urls) {
      let hash = urlListHashes.get(urls);
      if (hash === undefined) {
        hash = computeContentHash('', { urls });
        urlListHashes.set(urls, hash);
      }
      return hash;
    },
  };
}

/**
 * Output file and ISG cache key of a page.
 *
 * @throws Error when the page's file would not be inside the output directory
 */
export function getPageOutput(
  page: PageModel,
  outDir: string,
): { outputPath: string; cacheKey: string } {
  const outputPath = join(outDir, getPageOutputFile(page.url));

  // Loading and expanding skip such pages; this catches a hook that changed a page's URL
  if (!isPathWithinDirectory(outDir, outputPath)) {
    throw new Error(
      `The page ${page.url} (${page.sourcePath}) would be written outside the output directory: ${outputPath}. Remove the ".." segments from its URL.`,
    );
  }

  // Cache key is the output path from the root of outDir
  const cacheKey = `/${relative(outDir, outputPath).replace(/\\/g, '/')}`;
  return { outputPath, cacheKey };
}

/**
 * Hashes a value for the render inputs, or returns a value that never matches when it
 * cannot be serialized, so the page rebuilds instead of keeping stale output.
 */
function hashableData(value: unknown): unknown {
  try {
    JSON.stringify(value);
    return value ?? null;
  } catch {
    return `unserializable:${Date.now()}:${Math.random()}`;
  }
}

/**
 * The assets a page renders with and the inputs its cache hash covers: settings that change
 * its HTML without a file change, its collection path, its pagination slice and page count,
 * and a generated page's items. The collection summary and the navigation hash are added only
 * for what the render read.
 *
 * @param page - The page
 * @param session - The build's render session
 */
export function computeRenderInputs(page: PageModel, session: RenderSession): PageRenderInputs {
  const { config, pages, basePath, searchIndexPath, summaries, stylesheets } = session;
  const bundlePaths = getBundlePathsForPage(page.url, session.compiledBundles);
  const assets: StatiAssets = {
    bundlePaths,
    stylesheetPaths: stylesheets.stylesheetPaths(),
    ...(searchIndexPath && { searchIndexPath }),
  };

  // Collection the page sees as stati.collection; a page whose collection appears,
  // disappears or changes rebuilds even when it never read it
  const collectionPath = resolveCollectionPath(page, pages);
  const staticRenderInputs = {
    bundlePaths,
    ...(searchIndexPath && { searchIndexPath }),
    // Omitted without a base path, so the hash matches builds from before Stati supported one
    ...(basePath && { basePath }),
    // What stati.page.readingTime shows, which a new reading speed changes without a file change
    ...(page.wordCount !== undefined && { wordCount: page.wordCount }),
    ...(page.readingTime !== undefined && { readingTime: page.readingTime }),
    bundleAutoInject: config.typescript?.autoInject !== false,
    searchAutoInject: config.search?.autoInjectMetaTag !== false,
    // Empty without a stylesheet, so the hash matches builds from before Stati linked one
    ...stylesheets.fingerprint(),
    // Omitted with images: false, so the hash matches builds without the image pipeline
    ...(session.imageFingerprint && { images: session.imageFingerprint }),
    // The 404 page gets no Open Graph image and a noindex robots tag, so a copy cached
    // before Stati treated it that way is rebuilt
    ...(isNotFoundPage(page) && { notFoundPage: true }),
    collection: collectionPath ?? null,
    // A listing page depends on its own slice and on the page count, which every page
    // shows in its numbered links
    ...(page.pagination && {
      pagination: {
        pageNumber: page.pagination.pageNumber,
        totalPages: page.pagination.totalPages,
        urls: session.hashUrlList(page.pagination.urls),
        items: summaries.pages(page.pagination.items),
      },
    }),
    // A generated page depends on its own items only, not on the whole collection
    ...(page.generated && {
      generated: {
        key: page.generated.key,
        label: page.generated.label,
        template: page.generated.template,
        items: summaries.pages(page.generated.items),
        data: hashableData(page.generated.data),
      },
    }),
  };

  return {
    assets,
    hashFor: (reads) =>
      computeContentHash('', {
        ...staticRenderInputs,
        ...(reads?.collection && {
          collectionSummary:
            collectionPath !== undefined ? summaries.collection(collectionPath) : 'none',
        }),
        ...(reads?.nav && { navigation: session.navigationHash }),
      }),
  };
}

/**
 * Adds what a rendered page gets after its template, in this order: the SEO tags, the search
 * index meta tag, its stylesheet links ({@link StylesheetRuntime.linkPage}) and the bundles'
 * script tags, each unless its `autoInject` setting is false.
 *
 * @param page - The page
 * @param renderResult - What its template rendered
 * @param assets - The page's `stati.assets` after it rendered
 * @param session - The build's render session
 * @returns The page's final HTML
 */
export async function postProcessHtml(
  page: PageModel,
  renderResult: RenderResult,
  assets: StatiAssets,
  session: RenderSession,
): Promise<string> {
  const { config, logger, basePath, searchIndexPath } = session;
  let html = renderResult.html;

  if (config.seo?.autoInject !== false) {
    const injectOptions: AutoInjectOptions = {
      page,
      config,
      siteUrl: config.site.baseUrl,
      logger,
    };
    if (config.seo?.debug !== undefined) {
      injectOptions.debug = config.seo.debug;
    }
    if (renderResult.ogImage) {
      injectOptions.generatedImage = renderResult.ogImage;
    }
    html = autoInjectSEO(html, injectOptions);
  }

  if (searchIndexPath && config.search?.autoInjectMetaTag !== false) {
    html = autoInjectSearchMeta(html, `${basePath}${searchIndexPath}`);
  }

  html = await session.stylesheets.linkPage(html, page.url, assets.stylesheetPaths);

  if (config.typescript?.autoInject !== false && assets.bundlePaths.length > 0) {
    html = autoInjectBundles(html, assets.bundlePaths, basePath);
  }
  return html;
}

/**
 * Renders the pages the cache can't serve, with their `beforeRender` and `afterRender` hooks,
 * and writes them through the build's {@link createPageWriter | page writer}, which records
 * their cache entries. Reports progress and the per-page and phase timings as it goes.
 *
 * @param session - The build's render session
 */
export async function renderPages(session: RenderSession): Promise<RenderPagesResult> {
  const { config, outDir, pages, manifest, md, eta, logger, recorder } = session;
  const imageRuntime = session.images;
  let cacheHits = 0;
  let cacheMisses = 0;

  if (logger.startProgress) {
    logger.startProgress(pages.length);
  }

  const basePathLinks = new BasePathLinkReport(session.basePath);
  let totalShouldRebuildTime = 0;
  let totalMarkdownTime = 0;
  let totalRenderTime = 0;
  let totalPostRenderTime = 0;

  const writer = createPageWriter(session, isDevelopment());
  const renderedFiles: string[] = [];

  for (const page of pages) {
    const { outputPath, cacheKey } = getPageOutput(page, outDir);
    const existingEntry = manifest.entries[cacheKey];
    const inputs = computeRenderInputs(page, session);

    // Entries written before Stati recorded what pages read are rebuilt once to record it
    const readsKnown = existingEntry !== undefined && hasRecordedReads(existingEntry);
    const renderInputsHash = inputs.hashFor(
      readsKnown
        ? { collection: existingEntry.readsCollection!, nav: existingEntry.readsNav! }
        : undefined,
    );

    // Check if we should rebuild this page (considering ISG logic)
    const shouldRebuildStart = performance.now();
    const shouldRebuild =
      session.force ||
      config.isg?.enabled === false ||
      !(await pathExists(outputPath)) ||
      (existingEntry !== undefined && !readsKnown) ||
      // A cached page whose generated images are gone is rebuilt to regenerate them
      (imageRuntime !== null && !imageRuntime.outputsExist(existingEntry?.images)) ||
      (await shouldRebuildPage(
        page,
        existingEntry,
        config,
        pages,
        session.buildTime,
        renderInputsHash,
        session.templateIndex,
      ));
    totalShouldRebuildTime += performance.now() - shouldRebuildStart;

    if (!shouldRebuild) {
      // Cache hit - skip rendering
      cacheHits++;
      if (logger.updateProgress) {
        logger.updateProgress('cached', page.url);
      }
      // Record page timing for cached pages (0ms render time)
      recorder.recordPageTiming(page.url, 0, true);
      continue;
    }

    // Cache miss - need to rebuild
    cacheMisses++;
    const startTime = performance.now();

    if (config.hooks?.beforeRender) {
      const hookStart = performance.now();
      await config.hooks.beforeRender({ page, config });
      // The hook can change what the SEO defaults come from, such as the page's author
      refreshSEODefaults(page, config);
      recorder.addToPhase('hookBeforeRenderTotalMs', performance.now() - hookStart);
    }

    // Image state for this page: markup, dependencies and generated files
    const pageImages = imageRuntime?.createPageContext(page);

    // Render markdown to HTML with TOC extraction
    const markdownStart = performance.now();
    const tocEnabled = config.markdown?.toc !== false;
    const { html: htmlContent, toc } = renderMarkdown(page.content, md, tocEnabled, {
      images: pageImages,
      ...(session.basePath && { basePath: session.basePath }),
    });
    totalMarkdownTime += performance.now() - markdownStart;

    // Render with template
    const renderPageStart = performance.now();
    const renderResult = await renderPage(
      page,
      htmlContent,
      config,
      eta,
      session.navigation,
      pages,
      inputs.assets,
      toc,
      logger,
      { images: pageImages, templateIndex: session.templateIndex },
    );
    totalRenderTime += performance.now() - renderPageStart;
    const postRenderStart = performance.now();

    // Record the templates this page used and how often templates rendered
    recorder.increment('templatesLoaded', renderResult.templatesLoaded);
    recorder.increment('templateRenders', renderResult.templateRenders);
    recorder.increment('includeCacheHits', renderResult.includeCacheHits);

    const html = await postProcessHtml(page, renderResult, inputs.assets, session);

    // A root-relative link without the base path breaks when the site is served from it
    basePathLinks.add(page.url, html);

    // Start the image jobs the final HTML needs and record its image files for the cache,
    // along with what the render read, which decides the hash it is stored under
    const committedImages =
      pageImages && imageRuntime
        ? imageRuntime.commitPage(pageImages, html, { outputPath, cacheKey })
        : undefined;
    const renderedAssets: RenderedAssets = {
      assetDeps: committedImages?.assetDeps ?? [],
      images: committedImages?.images ?? [],
      reads: renderResult.reads,
      failed: renderResult.failed,
      templates: renderResult.templates,
      templateLookups: renderResult.templateLookups,
    };
    const renderedInputsHash = inputs.hashFor(renderResult.reads);
    totalPostRenderTime += performance.now() - postRenderStart;

    const renderTime = performance.now() - startTime;

    // Record page timing for rendered pages (includes template count)
    recorder.recordPageTiming(
      page.url,
      renderTime,
      false,
      renderResult.templatesLoaded,
      renderResult.templateRenders,
    );

    if (logger.updateProgress) {
      logger.updateProgress('rendered', page.url, Math.round(renderTime));
    }
    renderedFiles.push(outputPath);

    await writer.write({
      page,
      outputPath,
      cacheKey,
      html,
      existingEntry,
      renderInputsHash: renderedInputsHash,
      renderedAssets,
    });

    if (config.hooks?.afterRender) {
      const hookStart = performance.now();
      await config.hooks.afterRender({ page, config });
      recorder.addToPhase('hookAfterRenderTotalMs', performance.now() - hookStart);
    }
  }

  await writer.flush();

  basePathLinks.report(logger);

  // Record detailed phase timings in metrics. A hashed production build adds the time it takes
  // to write the pages it held to fileWriteTotalMs once Tailwind has run.
  recorder.recordPhase('shouldRebuildTotalMs', totalShouldRebuildTime);
  recorder.recordPhase('markdownRenderTotalMs', totalMarkdownTime);
  recorder.recordPhase('renderPageTotalMs', totalRenderTime);
  recorder.recordPhase('postRenderTotalMs', totalPostRenderTime);
  recorder.recordPhase('fileWriteTotalMs', writer.fileWriteMs);
  recorder.recordPhase('cacheEntryTotalMs', writer.cacheEntryMs);

  // Display final progress summary
  if (logger.endProgress) {
    logger.endProgress();
    if (logger.showRenderingSummary) {
      logger.showRenderingSummary();
    }
  }

  return { cacheHits, cacheMisses, renderedFiles };
}
