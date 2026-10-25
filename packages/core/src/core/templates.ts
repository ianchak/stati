import { Eta } from 'eta';
import { join, relative } from 'node:path';
import type {
  StatiConfig,
  PageModel,
  NavNode,
  CollectionData,
  TocEntry,
  Logger,
  TemplateLookup,
} from '../types/index.js';
import {
  createFallbackLogger,
  getStatiVersion,
  isCollectionIndexPage,
  resolveSrcDir,
  createTemplateError,
  propValue,
  slugify,
  createNavigationHelpers,
  addBasePath,
  getBasePath,
  withBasePath,
} from './utils/index.js';
import {
  getCollections,
  resolveCollectionPath,
  createCollectionView,
  copyPaginationData,
  copyGeneratedData,
} from './collections.js';
import type { PageReads } from './collections.js';
import { isDevelopment, isProduction } from '../env.js';
import { generateSEO, resolveGeneratedImagePlaceholders } from '../seo/index.js';
import type { OgTemplateRenderer, PageImages, StatiImageOptions } from '../images/runtime.js';
import type { GeneratedOgImage } from '../types/index.js';
import { TemplateIndex, type PageLayoutResolution } from './template-index.js';
import {
  RenderScope,
  failingTemplateOf,
  runInRenderScope,
  type BaseContext,
} from './template-render.js';
import { createStatiEtaPlugin, installEtaPlugin } from './eta-plugin.js';

/**
 * Result of rendering a page template.
 */
export interface RenderResult {
  /** The rendered HTML content */
  html: string;
  /** Number of distinct template files the page rendered */
  templatesLoaded: number;
  /** Templates rendered, counting a template each time it renders */
  templateRenders: number;
  /** Includes served from the page's cache instead of rendering again */
  includeCacheHits: number;
  /** Open Graph image generated for the page, if any */
  ogImage?: GeneratedOgImage | undefined;
  /** Shared data the render read, which the cache entry records */
  reads: PageReads;
  /**
   * Every template file the render used, as absolute POSIX paths, the page's layout first:
   * the layout, its parents, the templates it included and the Open Graph template. A failed
   * render lists the templates up to the one that failed.
   */
  templates: string[];
  /** Template names the render looked up, with what each resolved to */
  templateLookups: TemplateLookup[];
}

/**
 * Page-specific state for {@link renderPage}.
 */
export interface RenderPageExtras {
  /** Image state of the page; without it `stati.image()` emits a plain `<img>` */
  images?: PageImages | undefined;
  /** The build's template index; without it the source directory is read for this page */
  templateIndex?: TemplateIndex | undefined;
}

/**
 * `stati.image()` when images are turned off: a plain `<img>`, attributes escaped.
 */
function renderPlainImage(
  src: unknown,
  options: StatiImageOptions = {},
  basePath: string = '',
): string {
  if (typeof src !== 'string' || !src.trim()) {
    return '';
  }
  const attributes = [
    `src="${escapeHtml(addBasePath(src, basePath))}"`,
    `alt="${escapeHtml(options.alt ?? '')}"`,
    ...(options.title ? [`title="${escapeHtml(options.title)}"`] : []),
    ...(options.class ? [`class="${escapeHtml(options.class)}"`] : []),
  ];
  return `<img ${attributes.join(' ')}>`;
}

/**
 * Wraps the navigation helpers for one render so that reading any of them sets `reads.nav`.
 * Like the collection view, it uses accessors on a plain object, so spreading the template
 * context does not count as a read. The helpers return the shared nodes unchanged.
 */
function createNavView<T extends object>(helpers: T, reads: PageReads): T {
  const view = {} as T;
  for (const [key, initial] of Object.entries(helpers)) {
    let value: unknown = initial;
    Object.defineProperty(view, key, {
      enumerable: true,
      configurable: true,
      get() {
        reads.nav = true;
        return value;
      },
      set(next: unknown) {
        reads.nav = true;
        value = next;
      },
    });
  }
  return view;
}

/**
 * Cached template engine for dev mode to avoid re-creating on each rebuild.
 *
 * Recreating the Eta instance and recompiling every template on each dev rebuild
 * generates large transient native allocations that the V8 allocator does not
 * return to the OS, causing monotonic RSS growth and increasing rebuild times
 * over a long dev session. Reusing a single instance (with template caching on)
 * keeps rebuild cost flat. The cache is keyed by template directory so a config
 * change pointing to a different srcDir still produces a fresh engine.
 */
let cachedTemplateEngine: { templateDir: string; eta: Eta } | null = null;

/**
 * Clear the cached template engine. Call this when templates change in dev mode
 * so the next build recompiles them, or when shutting down a dev session.
 */
export function clearTemplateEngineCache(): void {
  cachedTemplateEngine = null;
}

/**
 * Creates the template engine: Eta with `stati` as its data variable and Stati's plugin,
 * which replaces Eta's own `include()`, `layout()` and `block()` in templates.
 *
 * @throws {Error} When the installed Eta generates code the plugin does not recognize
 */
export function createTemplateEngine(config: StatiConfig): Eta {
  const templateDir = resolveSrcDir(config);

  // In dev mode, reuse a single cached engine across rebuilds to avoid
  // per-rebuild compile churn and the associated native-memory growth.
  if (isDevelopment() && cachedTemplateEngine && cachedTemplateEngine.templateDir === templateDir) {
    return cachedTemplateEngine.eta;
  }

  // Enable the template cache in dev too so templates compile once and are reused
  // across rebuilds; template edits clear this cache via clearTemplateEngineCache().
  const useCache = isDevelopment() || isProduction();
  const eta = new Eta({
    views: templateDir,
    cache: useCache,
    cacheFilepaths: useCache,
    varName: 'stati',
    // Debug mode wraps runtime errors with the template path and line number,
    // which the dev error overlay uses to point at the failing line
    debug: isDevelopment(),
    plugins: [createStatiEtaPlugin()],
  });
  installEtaPlugin(eta);

  if (isDevelopment()) {
    cachedTemplateEngine = { templateDir, eta };
  }

  return eta;
}

/**
 * Renders a page: its layout (chosen by front matter `layout:` or discovery), the parents the
 * layout names with `stati.layout()`, and every template they include, plus the page's Open
 * Graph template when it gets a generated image. Records every template and name lookup for
 * the ISG cache.
 */
export async function renderPage(
  page: PageModel,
  body: string,
  config: StatiConfig,
  eta: Eta,
  navigation?: NavNode[],
  allPages?: PageModel[],
  assets?: import('../types/index.js').StatiAssets,
  toc?: TocEntry[],
  logger?: Logger,
  extras?: RenderPageExtras,
): Promise<RenderResult> {
  const log = logger || createFallbackLogger();
  const index = extras?.templateIndex ?? (await TemplateIndex.load(resolveSrcDir(config)));
  const scope = new RenderScope({ page, eta, index, logger: log, development: isDevelopment() });
  return runInRenderScope(scope, () =>
    renderPageInScope(scope, body, config, navigation, allPages, assets, toc, extras?.images),
  );
}

async function renderPageInScope(
  scope: RenderScope,
  body: string,
  config: StatiConfig,
  navigation: NavNode[] | undefined,
  allPages: PageModel[] | undefined,
  assets: import('../types/index.js').StatiAssets | undefined,
  toc: TocEntry[] | undefined,
  pageImages: PageImages | undefined,
): Promise<RenderResult> {
  const { page, logger: log, index } = scope;
  // The path the site is served from, which stati.url() adds to a site-relative path
  const basePath = getBasePath(config.site.baseUrl);
  // The generated Open Graph image is known once the og template has rendered, before the
  // layout. Until then stati.generateSEO() emits placeholders for its tags.
  const ogState: { image: GeneratedOgImage | undefined; pending: boolean } = {
    image: undefined,
    pending: pageImages?.wantsOg() ?? false,
  };

  // What this render reads from shared data, so the cache can rebuild the page when it changes
  const reads: PageReads = { collection: false, nav: false };

  // The page's collection: its own on index pages, the one it belongs to on other pages, or
  // the one its front matter names. Collections are computed once per page list.
  let collectionData: CollectionData | undefined;
  const isIndexPage = allPages !== undefined && isCollectionIndexPage(page, allPages);

  if (allPages) {
    const collectionPath = resolveCollectionPath(page, allPages);
    const data =
      collectionPath !== undefined
        ? getCollections(allPages).byPath.get(collectionPath)
        : undefined;
    if (data) {
      collectionData = createCollectionView(data, reads);
    }
  }

  // The layout: front matter `layout:` by the name lookup, otherwise layout.eta discovery
  // (index.eta first on index pages)
  const layout = index.resolvePageLayout(scope.pageFile, page.frontMatter.layout, isIndexPage);
  for (const lookup of layout.lookups) {
    scope.record(lookup);
  }
  reportFrontMatterLayout(scope, layout);

  // Create navigation helpers
  const navTree = navigation || [];
  const navHelpers = createNavigationHelpers(navTree, page);
  const currentNavNode = navHelpers.getCurrentNode();

  // Define page-specific properties that override frontmatter
  const pageOverrides = {
    path: page.url,
    url: page.url, // Add url property for compatibility
    content: body,
    navNode: currentNavNode, // Add current page's navigation node
    toc: toc || [], // Table of contents entries extracted from markdown headings
    ...(page.wordCount !== undefined && { wordCount: page.wordCount }),
    ...(page.readingTime !== undefined && { readingTime: page.readingTime }),
  };

  // Check for frontmatter keys that conflict with reserved page properties
  const conflictingKeys = Object.keys(pageOverrides).filter((key) => key in page.frontMatter);
  if (conflictingKeys.length > 0) {
    log.warning(
      `Frontmatter in "${page.sourcePath}" contains reserved keys that will be overwritten: ${conflictingKeys.join(', ')}`,
    );
  }

  // The current page's navigation node counts as a navigation read
  const pageContext: Record<string, unknown> = { ...page.frontMatter, ...pageOverrides };
  Object.defineProperty(pageContext, 'navNode', {
    enumerable: true,
    configurable: true,
    get() {
      reads.nav = true;
      return currentNavNode;
    },
  });

  // Values every template of the page shares. Each render adds props, body, include and layout.
  // The site's helpers live under `helpers`; the root holds only Stati's own API.
  const values: Record<string, unknown> = {
    site: config.site,
    page: pageContext,
    content: body,
    nav: createNavView(navHelpers, reads),
    collection: collectionData,
    // Set on paginated listings and on pages generated from [param].md templates
    pagination: page.pagination ? copyPaginationData(page.pagination) : undefined,
    generated: page.generated ? copyGeneratedData(page.generated) : undefined,
    // A copy, so a template that replaces a helper does not change it for later pages
    helpers: { ...config.helpers },
    generator: {
      version: getStatiVersion(),
    },
    generateSEO: (tags?: string[]) =>
      generateSEO(
        {
          page,
          config,
          site: config.site,
          generatedImage: ogState.image,
          deferGeneratedImage: ogState.pending,
        },
        tags,
      ),
    propValue,
    slugify,
    // A site-relative path with the base path added, safe to apply twice
    url: (path: unknown) =>
      withBasePath(typeof path === 'string' ? path : String(path ?? ''), basePath),
    // Image with dimensions, lazy loading and, with images.responsive, srcset variants
    image: (src: unknown, options?: StatiImageOptions) =>
      pageImages
        ? pageImages.renderHelperImage(src, options)
        : renderPlainImage(src, options, basePath),
    assets, // TypeScript bundle assets (available when typescript.enabled is true)
    // Set while the Open Graph template renders: { width, height }
    og: undefined as { width: number; height: number } | undefined,
    // The page's generated Open Graph image, once rendered: { url, path, width, height, alt }
    ogImage: undefined as GeneratedOgImage | undefined,
  };

  // Render the Open Graph template with the layout's values, minus the page body, so the
  // generated image is known before the layout renders its SEO tags
  if (pageImages && ogState.pending) {
    // Copy the page's property descriptors so that navNode stays a getter: spreading would
    // read it and count every page with a card as reading the navigation
    const ogPage = Object.defineProperties(
      {},
      Object.getOwnPropertyDescriptors(pageContext),
    ) as Record<string, unknown>;
    ogPage.content = '';
    const ogBase: BaseContext = {
      id: 'og',
      values: { ...values, content: '', page: ogPage, og: pageImages.ogSize() },
    };
    ogState.image = (await pageImages.renderOg(createOgRenderer(scope, ogBase))) ?? undefined;
    ogState.pending = false;
    values.ogImage = ogState.image;
  }

  const result = (html: string): RenderResult => ({
    html,
    templatesLoaded: scope.templates.size,
    templateRenders: scope.renders,
    includeCacheHits: scope.includeCacheHits,
    ogImage: ogState.image,
    reads,
    templates: scope.templateFiles(layout.file),
    templateLookups: [...scope.lookups.values()],
  });

  if (!layout.file) {
    log.warning('No layout template found, using fallback');
    return result(createFallbackHtml(page, body));
  }

  try {
    const html = await scope.renderAsync({ id: 'page', values }, { file: layout.file });
    return result(resolveGeneratedImagePlaceholders(html, ogState.image));
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    const failed = failingTemplateOf(failure) ?? layout.file;

    // In development, throw the error for the overlay; it points at the innermost template
    if (isDevelopment()) {
      const failedPath = join(index.srcDir, failed);
      const templateError = createTemplateError(failure, failedPath);
      const where = scope.displayPath(templateError.filePath ?? failedPath);
      log.error(`Error rendering ${where} for ${page.url}: ${templateError.message}`);
      throw templateError;
    }

    log.error(`Error rendering ${scope.display(failed)} for ${page.url}: ${failure.message}`);
    return result(createFallbackHtml(page, body));
  }
}

/**
 * Warns about a front matter `layout:` value that names no template, with the templates it
 * could have meant. Layout discovery picks the page's layout instead.
 */
function reportFrontMatterLayout(scope: RenderScope, layout: PageLayoutResolution): void {
  const unresolved = layout.unresolvedFrontMatter;
  if (!unresolved) {
    return;
  }
  const page = scope.displayPath(scope.page.sourcePath);
  const used = layout.file === null ? 'the fallback HTML' : scope.display(layout.file);
  const didYouMean =
    unresolved.suggestions.length > 0
      ? ` Did you mean ${unresolved.suggestions.map((name) => `"${name}"`).join(', ')}?`
      : '';
  scope.logger.warning(
    `${page}: front matter layout ${JSON.stringify(unresolved.value)} ${unresolved.problem}; using ${used}.${didYouMean}`,
  );
}

/**
 * Lets the image pipeline find the page's Open Graph template through the template index,
 * recording the lookup, and render it through the render scope, so it can use
 * `stati.include()` and `stati.layout()` like any template.
 */
function createOgRenderer(scope: RenderScope, base: BaseContext): OgTemplateRenderer {
  return {
    find(templateName) {
      const name = templateName.replace(/\.eta$/, '');
      const file = scope.index.lookup(name, scope.pageFolder);
      scope.record({ name, from: scope.pageFolder, file });
      return file === null ? null : join(scope.index.srcDir, file);
    },
    render(template) {
      return 'path' in template
        ? scope.renderAsync(base, {
            file: relative(scope.index.srcDir, template.path).replace(/\\/g, '/'),
          })
        : scope.renderAsync(base, { source: template.source });
    },
  };
}

function createFallbackHtml(page: PageModel, body: string): string {
  const title = page.frontMatter.title || 'Untitled';
  const description = page.frontMatter.description || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

function escapeHtml(value: unknown): string {
  const text = String(value);
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]!);
}
