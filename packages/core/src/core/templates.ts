import { Eta } from 'eta';
import { join, dirname, relative, basename, posix } from 'node:path';
import glob from 'fast-glob';
import type {
  StatiConfig,
  PageModel,
  NavNode,
  CollectionData,
  TocEntry,
  Logger,
} from '../types/index.js';
import { createFallbackLogger } from './utils/index.js';
import { TEMPLATE_EXTENSION } from '../constants.js';
import {
  getStatiVersion,
  isCollectionIndexPage,
  discoverLayout,
  resolveSrcDir,
  createTemplateError,
  createValidatingPartialsProxy,
  createValidatingContextProxy,
  propValue,
  slugify,
  wrapPartialsAsCallable,
  createNavigationHelpers,
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
import type { PageImages, StatiImageOptions } from '../images/runtime.js';
import type { GeneratedOgImage } from '../types/index.js';

/**
 * Result of rendering a page template.
 */
export interface RenderResult {
  /** The rendered HTML content */
  html: string;
  /** Number of templates loaded (layout + partials) */
  templatesLoaded: number;
  /** Open Graph image generated for the page, if any */
  ogImage?: GeneratedOgImage | undefined;
  /** Shared data the render read, which the cache entry records */
  reads: PageReads;
}

/**
 * Page-specific state for {@link renderPage}.
 */
export interface RenderPageExtras {
  /** Image state of the page; without it `stati.image()` emits a plain `<img>` */
  images?: PageImages | undefined;
}

/**
 * `stati.image()` when images are turned off: a plain `<img>`, attributes escaped.
 */
function renderPlainImage(src: unknown, options: StatiImageOptions = {}): string {
  if (typeof src !== 'string' || !src.trim()) {
    return '';
  }
  const attributes = [
    `src="${escapeHtml(src)}"`,
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
 * Discovers partials in the hierarchy for a given page path.
 * Scans all parent directories for folders starting with underscore.
 *
 * @param pagePath - The path to the page (relative to srcDir)
 * @param config - Stati configuration
 * @returns Object mapping partial names to their file paths
 */
async function discoverPartials(
  pagePath: string,
  config: StatiConfig,
): Promise<Record<string, string>> {
  const srcDir = resolveSrcDir(config);
  const partials: Record<string, string> = {};

  // Get the directory of the current page
  const pageDir = dirname(pagePath);
  const pathSegments = pageDir === '.' ? [] : pageDir.split('/');

  // Scan from root to current directory (least specific first)
  // This allows more specific partials to override less specific ones
  const dirsToScan = [];
  if (pathSegments.length > 0) {
    // Add root directory first, then parent directories, then current
    dirsToScan.push(''); // Root directory first
    // Add directories from root to current
    for (let i = 1; i <= pathSegments.length; i++) {
      dirsToScan.push(pathSegments.slice(0, i).join('/'));
    }
  } else {
    dirsToScan.push(''); // Root directory only
  }

  for (const dir of dirsToScan) {
    const searchDir = dir ? join(srcDir, dir) : srcDir;

    // Find all underscore folders in this directory level
    const globPattern = join(searchDir, '_*/').replace(/\\/g, '/');
    const underscoreFolders = await glob(globPattern, {
      absolute: true,
      onlyDirectories: true,
    });

    // Scan each underscore folder for .eta files
    for (const folderPath of underscoreFolders) {
      const etaFiles = await glob('**/*.eta', {
        cwd: folderPath,
        absolute: false,
      });

      for (const etaFile of etaFiles) {
        const partialName = basename(etaFile, TEMPLATE_EXTENSION);
        const fullPath = join(folderPath, etaFile);

        // Get relative path from srcDir to the partial file
        const relativePath = relative(srcDir, fullPath);
        partials[partialName] = posix.normalize(relativePath);
      }
    }
  }

  return partials;
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

export function createTemplateEngine(config: StatiConfig): Eta {
  const templateDir = resolveSrcDir(config);

  // In dev mode, reuse a single cached engine across rebuilds to avoid
  // per-rebuild compile churn and the associated native-memory growth.
  if (isDevelopment() && cachedTemplateEngine && cachedTemplateEngine.templateDir === templateDir) {
    return cachedTemplateEngine.eta;
  }

  // Enable the template cache in dev too so partials/layouts compile once and are
  // reused across rebuilds; template edits clear this cache via clearTemplateEngineCache().
  const useCache = isDevelopment() || isProduction();
  const eta = new Eta({
    views: templateDir,
    cache: useCache,
    cacheFilepaths: useCache,
    varName: 'stati',
    // Debug mode wraps runtime errors with the template path and line number,
    // which the dev error overlay uses to point at the failing line
    debug: isDevelopment(),
  });

  if (isDevelopment()) {
    cachedTemplateEngine = { templateDir, eta };
  }

  return eta;
}

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
  const pageImages = extras?.images;
  // The generated Open Graph image is known once the og template has rendered, after the
  // partials. Until then stati.generateSEO() emits placeholders for its tags.
  const ogState: { image: GeneratedOgImage | undefined; pending: boolean } = {
    image: undefined,
    pending: pageImages?.wantsOg() ?? false,
  };

  // Discover partials for this page's directory hierarchy
  const srcDir = resolveSrcDir(config);
  const relativePath = relative(srcDir, page.sourcePath);
  const partialPaths = await discoverPartials(relativePath, config);

  // Count templates: partials + layout (if found)
  const partialsCount = Object.keys(partialPaths).length;

  // What this render reads from shared data, so the cache can rebuild the page when it changes
  const reads: PageReads = { collection: false, nav: false };

  // The page's collection: its own on index pages, the one it belongs to on other pages, or
  // the one its front matter names. Collections are computed once per page list.
  let collectionData: CollectionData | undefined;
  const isIndexPage = allPages && isCollectionIndexPage(page, allPages);

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

  // Discover the appropriate layout using hierarchical layout.eta convention
  // Pass isIndexPage flag to enable index.eta lookup for aggregation pages
  const layoutPath = await discoverLayout(
    relativePath,
    config,
    page.frontMatter.layout,
    isIndexPage,
  );

  // Calculate total templates loaded (partials + layout if present)
  const templatesLoaded = partialsCount + (layoutPath ? 1 : 0);

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

  // Create base context for partial rendering
  const baseContext = {
    site: config.site,
    page: pageContext,
    content: body,
    nav: createNavView(navHelpers, reads), // Replace navigation with nav helpers
    collection: collectionData, // Add collection data
    // Set on paginated listings and on pages generated from [param].md templates. Placed before
    // the filters, like slugify, so that an existing filter with the same name keeps working.
    pagination: page.pagination ? copyPaginationData(page.pagination) : undefined,
    generated: page.generated ? copyGeneratedData(page.generated) : undefined,
    slugify,
    // Add custom filters to context
    ...(config.eta?.filters || {}),
    generator: {
      version: getStatiVersion(),
    },
    // Stati utilities object with helper functions
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
    // Image with dimensions, lazy loading and, with images.responsive, srcset variants
    image: (src: unknown, options?: StatiImageOptions) =>
      pageImages ? pageImages.renderHelperImage(src, options) : renderPlainImage(src, options),
    assets, // TypeScript bundle assets (available when typescript.enabled is true)
    // Set by callable partials invoked with props; always present so that
    // stati.props?.x works under the dev-mode context validation
    props: undefined,
    // Set while the Open Graph template renders: { width, height }
    og: undefined as { width: number; height: number } | undefined,
    // The page's generated Open Graph image, once rendered: { url, path, width, height, alt }
    ogImage: undefined as GeneratedOgImage | undefined,
  };

  // Render partials and store their content
  // Use multiple passes to allow partials to reference other partials
  const renderedPartials: Record<string, string> = {};
  const maxPasses = 3; // Prevent infinite loops

  for (let pass = 0; pass < maxPasses; pass++) {
    // Each pass renders all partials to ensure they have access to all previously rendered ones
    // TODO: Optimize by tracking which partials changed or have dependencies
    const partialsToRender: Record<string, string> = { ...partialPaths };

    if (Object.keys(partialsToRender).length === 0) {
      break;
    }

    let progressMade = false;
    const passRenderedPartials: Record<string, string> = {};

    for (const [partialName, partialPath] of Object.entries(partialsToRender)) {
      try {
        // Create context with all previously rendered partials available
        const combinedPartials = { ...renderedPartials, ...passRenderedPartials };

        // Wrap partials as callable before passing to validation proxy
        const callablePartials = wrapPartialsAsCallable(
          eta,
          combinedPartials,
          partialPaths,
          baseContext,
        );

        const partialContext = createValidatingContextProxy({
          ...baseContext,
          partials: createValidatingPartialsProxy(callablePartials), // Include both previous and current pass partials with validation
        });

        const renderedContent = await eta.renderAsync(partialPath, partialContext);
        passRenderedPartials[partialName] = renderedContent;
        progressMade = true;
      } catch (error) {
        // If this is the last pass, log the error and create placeholder
        if (pass === maxPasses - 1) {
          log.warning(
            `Failed to render partial ${partialName} at ${partialPath}: ${error instanceof Error ? error.message : String(error)}`,
          );

          // In development mode, throw enhanced template error for partials too
          if (isDevelopment()) {
            const templateError = createTemplateError(
              error instanceof Error ? error : new Error(String(error)),
              partialPath,
            );
            throw templateError;
          }

          passRenderedPartials[partialName] = `<!-- Error rendering partial: ${partialName} -->`;
          progressMade = true;
        }
        // Otherwise, use existing content if available, or skip for retry
        else if (renderedPartials[partialName]) {
          passRenderedPartials[partialName] = renderedPartials[partialName];
        }
        // For failed partials on non-last pass, still count as progress to allow retries
        else {
          progressMade = true;
        }
      }
    }

    // Update the rendered partials with this pass's results
    Object.assign(renderedPartials, passRenderedPartials);

    // If no progress was made, break to avoid infinite loop
    if (!progressMade) {
      break;
    }

    // If this is pass 0, always do at least one more pass to allow interdependencies
    if (pass === 0) {
      continue;
    }

    // For subsequent passes, only continue if we're not at max passes yet
    if (pass >= maxPasses - 1) {
      break;
    }
  }

  // Render the Open Graph template with the layout's context, minus the page body, so the
  // generated image is known before the layout renders its SEO tags
  if (pageImages && ogState.pending) {
    // Copy the page's property descriptors so that navNode stays a getter: spreading would
    // read it and count every page with a card as reading the navigation
    const ogPage = Object.defineProperties(
      {},
      Object.getOwnPropertyDescriptors(baseContext.page),
    ) as Record<string, unknown>;
    ogPage.content = '';
    const ogBaseContext = {
      ...baseContext,
      content: '',
      page: ogPage,
      og: pageImages.ogSize(),
    };
    const ogContext = createValidatingContextProxy({
      ...ogBaseContext,
      partials: createValidatingPartialsProxy(
        wrapPartialsAsCallable(eta, renderedPartials, partialPaths, ogBaseContext),
      ),
    });
    ogState.image = (await pageImages.renderOg(ogContext, eta)) ?? undefined;
    ogState.pending = false;
    baseContext.ogImage = ogState.image;
  }

  // Wrap final rendered partials as callable before passing to layout context
  const callablePartials = wrapPartialsAsCallable(eta, renderedPartials, partialPaths, baseContext);

  const context = createValidatingContextProxy({
    ...baseContext,
    partials: createValidatingPartialsProxy(callablePartials), // Add rendered partials with validation
  });

  try {
    if (!layoutPath) {
      log.warning('No layout template found, using fallback');
      return {
        html: createFallbackHtml(page, body),
        templatesLoaded,
        ogImage: ogState.image,
        reads,
      };
    }

    const html = await eta.renderAsync(layoutPath, context);
    return {
      html: resolveGeneratedImagePlaceholders(html, ogState.image),
      templatesLoaded,
      ogImage: ogState.image,
      reads,
    };
  } catch (error) {
    log.error(
      `Error rendering layout ${layoutPath || 'unknown'}: ${error instanceof Error ? error.message : String(error)}`,
    );

    // In development mode, throw enhanced template error for better debugging
    if (isDevelopment()) {
      const templateError = createTemplateError(
        error instanceof Error ? error : new Error(String(error)),
        layoutPath || undefined,
      );
      throw templateError;
    }

    return {
      html: createFallbackHtml(page, body),
      templatesLoaded,
      ogImage: ogState.image,
      reads,
    };
  }
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

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]!);
}
