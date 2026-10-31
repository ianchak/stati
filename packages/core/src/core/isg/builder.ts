import type {
  PageModel,
  CacheEntry,
  StatiConfig,
  TemplateLookup,
  Logger,
} from '../../types/index.js';
import type { PageReads } from '../collections.js';
import {
  computeContentHash,
  computeFileHash,
  computeBinaryFileHash,
  computeInputsHash,
} from './hash.js';
import { resolveLayoutDependency } from './deps.js';
import { STALE_INPUTS_HASH } from '../../constants.js';
import { computeEffectiveTTL, isTtlExpired } from './ttl.js';
import { validatePageISGOverrides, extractNumericOverride } from './validation.js';
import {
  createFallbackLogger,
  getFrontMatterDate,
  normalizePathForComparison,
  resolveSrcDir,
} from '../utils/index.js';
import { TemplateIndex } from '../template-index.js';

/**
 * Determines the output path for a page.
 */
function getOutputPath(page: PageModel): string {
  if (page.url === '/') {
    return '/index.html';
  } else if (page.url.endsWith('/')) {
    return `${page.url}index.html`;
  } else {
    return `${page.url}.html`;
  }
}

/**
 * What a render discovered: the templates it used (`templates`, `templateLookups`), the source
 * images a page displays (`assetDeps`), the generated images it references (`images`) and the
 * shared data it read (`reads`).
 */
export interface RenderedAssets {
  /** Absolute paths of files whose content affects the page, such as source images */
  assetDeps: readonly string[];
  /** Generated image files the page references, relative to the output directory */
  images: readonly string[];
  /** Whether the render read the collection and the navigation tree */
  reads?: PageReads | undefined;
  /** Template files the render used, absolute POSIX paths, the page's layout first */
  templates?: readonly string[] | undefined;
  /** Template names the render looked up, with what each resolved to */
  templateLookups?: readonly TemplateLookup[] | undefined;
  /**
   * Whether the page rendered with an error. Its entry is stored with a stale hash, so the
   * page renders again, and logs the error again, on every build until the error is fixed.
   */
  failed?: boolean | undefined;
}

/**
 * Whether a cache entry records what its page read while rendering. Entries written before
 * Stati recorded it don't, and their page must be rebuilt once: whether it depends on its
 * collection or the navigation tree is unknown, and assuming it doesn't could keep stale
 * listings or prev/next links.
 *
 * @param entry - The cache entry
 * @returns True when `readsCollection` and `readsNav` are both recorded
 */
export function hasRecordedReads(entry: CacheEntry): boolean {
  return typeof entry.readsCollection === 'boolean' && typeof entry.readsNav === 'boolean';
}

/**
 * Whether a cache entry's templates and name lookups were recorded while its page rendered.
 * An entry without them cannot tell when a template change affects its page, so the page is
 * rebuilt once to record them.
 *
 * @param entry - The cache entry
 * @returns True when `templatesRecorded` is set
 */
export function hasRecordedTemplates(entry: CacheEntry): boolean {
  return entry.templatesRecorded === true;
}

/**
 * Tags a page's cache entry carries for `stati invalidate "tag:…"`: its front matter tags,
 * plus the key and label of a generated page, so `tag:css` also refreshes `/tags/css`.
 */
function getCacheTags(page: PageModel): string[] {
  const tags = Array.isArray(page.frontMatter.tags)
    ? page.frontMatter.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  if (page.generated) {
    for (const tag of [page.generated.key, page.generated.label]) {
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }
  return tags;
}

/**
 * Hashes render-discovered dependencies by content. Missing files hash to a sentinel.
 */
async function hashAssetDeps(assetDeps: readonly string[] | undefined): Promise<string[]> {
  const hashes: string[] = [];
  for (const assetPath of assetDeps ?? []) {
    hashes.push(await computeBinaryFileHash(assetPath));
  }
  return hashes;
}

/**
 * Returns the entry with its `assetDeps` and `images` replaced by this render's,
 * dropping the fields when a render found none, and with what the render read.
 */
function withRenderedAssets(entry: CacheEntry, rendered: RenderedAssets | undefined): CacheEntry {
  const {
    assetDeps: _assetDeps,
    images: _images,
    readsCollection: _readsCollection,
    readsNav: _readsNav,
    ...rest
  } = entry;
  return {
    ...rest,
    ...(rendered && rendered.assetDeps.length > 0 && { assetDeps: [...rendered.assetDeps] }),
    ...(rendered && rendered.images.length > 0 && { images: [...rendered.images] }),
    // Always written, false included: a missing flag means "unknown" and forces a rebuild
    ...(rendered?.reads && {
      readsCollection: rendered.reads.collection,
      readsNav: rendered.reads.nav,
    }),
  };
}

/**
 * Determines if a page should be rebuilt based on ISG logic.
 * Checks content changes, the templates the last render recorded, the page's layout, TTL
 * expiration, and freeze status.
 *
 * A cached page is stale when a template it rendered changed or no longer exists, when its
 * layout would now be a different file, or when a template name it looked up would now
 * resolve differently (checked against the template index, without reading files).
 *
 * The entry is trusted as it is: entries come from {@link createCacheEntry} or from a manifest
 * that `parseCacheEntry` (`entry.ts`) checked while loading it.
 *
 * @param page - The page model to check
 * @param entry - Existing cache entry, or undefined if not cached
 * @param config - Stati configuration
 * @param allPages - All pages in the site, used to resolve the same layout as rendering
 * @param now - Current date/time
 * @param renderInputsHash - Optional hash of asset URLs and injection settings
 * @param templateIndex - The build's template index; read from the source directory when omitted
 * @param logger - Where warnings go; the console when omitted
 * @returns True if the page should be rebuilt
 *
 * @example
 * ```typescript
 * const shouldRebuild = await shouldRebuildPage(page, cacheEntry, config, pages, new Date());
 * if (shouldRebuild) {
 *   console.log('Page needs rebuilding');
 * }
 * ```
 */
export async function shouldRebuildPage(
  page: PageModel,
  entry: CacheEntry | undefined,
  config: StatiConfig,
  allPages: PageModel[],
  now: Date,
  renderInputsHash?: string,
  templateIndex?: TemplateIndex,
  logger?: Logger,
): Promise<boolean> {
  if (config.isg?.enabled === false) {
    return true;
  }

  // Always rebuild if no cache entry exists
  if (!entry) {
    return true;
  }

  try {
    // Entries from before templates were recorded while rendering rebuild once to record them
    if (!hasRecordedTemplates(entry)) {
      return true;
    }

    const index = templateIndex ?? (await TemplateIndex.load(resolveSrcDir(config)));

    // The page can switch layouts without a template file changing, for example when a
    // collection gains its first child page. deps[0] is the layout. A page without a layout
    // renders Stati's fallback HTML; it always rebuilds, so a new layout.eta takes effect.
    // Compared in normalized form: the drive letter's case follows the shell that ran the build.
    const layout = resolveLayoutDependency(page, allPages, index);
    const recordedLayout = entry.deps[0];
    if (
      layout === null ||
      recordedLayout === undefined ||
      normalizePathForComparison(layout) !== normalizePathForComparison(recordedLayout)
    ) {
      return true;
    }

    // A name the page looked up would now find another template, such as a section override
    // added at the same path, or a file that stati.include.has() did not find
    if (index.lookupsChanged(entry.templateLookups)) {
      return true;
    }

    // Check if inputs (content + dependencies) have changed
    const currentContentHash = computeContentHash(page.content, page.frontMatter);

    // Hash every template the page rendered; one that no longer exists rebuilds the page
    const depsHashes: string[] = [];
    for (const dep of entry.deps) {
      const depHash = await computeFileHash(dep);
      if (!depHash) {
        return true;
      }
      depsHashes.push(depHash);
    }

    // Files found during the last render, such as images, are hashed by content
    depsHashes.push(...(await hashAssetDeps(entry.assetDeps)));

    const currentInputsHash = computeInputsHash(currentContentHash, depsHashes, renderInputsHash);

    // If inputs changed, always rebuild
    if (currentInputsHash !== entry.inputsHash) {
      return true;
    }

    // Unchanged inputs: rebuild once the TTL has run out, unless the page is frozen
    return isTtlExpired(entry, now, logger);
  } catch (error) {
    // For any unexpected errors, log and force rebuild to be safe
    (logger ?? createFallbackLogger()).warning(
      `Error checking rebuild status for ${page.url}, forcing rebuild: ${error instanceof Error ? error.message : String(error)}`,
    );
    return true;
  }
}

/**
 * Creates a new cache entry for a page after it has been rendered, with the templates and name
 * lookups the render recorded (`rendered`).
 *
 * @param page - The page model
 * @param config - Stati configuration
 * @param renderedAt - When the page was rendered
 * @param renderInputsHash - Optional hash of asset URLs and injection settings
 * @param rendered - What the render used: templates, lookups, images and shared data. Without
 *   recorded templates the entry is not marked `templatesRecorded` and the page rebuilds next time.
 * @returns New cache entry
 *
 * @example
 * ```typescript
 * const entry = await createCacheEntry(page, config, new Date(), renderInputsHash, rendered);
 * ```
 */
export async function createCacheEntry(
  page: PageModel,
  config: StatiConfig,
  renderedAt: Date,
  renderInputsHash?: string,
  rendered?: RenderedAssets,
): Promise<CacheEntry> {
  // Validate page-level ISG overrides first
  validatePageISGOverrides(page.frontMatter, page.sourcePath);

  const contentHash = computeContentHash(page.content, page.frontMatter);

  // The templates the render used, the layout first
  const deps = [...(rendered?.templates ?? [])];
  const depsHashes: string[] = [];
  for (const dep of deps) {
    const depHash = await computeFileHash(dep);
    if (depHash) {
      depsHashes.push(depHash);
    }
  }
  depsHashes.push(...(await hashAssetDeps(rendered?.assetDeps)));

  const inputsHash = computeInputsHash(contentHash, depsHashes, renderInputsHash);

  // Extract tags from front matter
  const tags = getCacheTags(page);

  // Get published date
  const publishedAt = getPublishedDateISO(page);

  // Compute effective TTL
  const isgConfig = config.isg || {};
  const ttlSeconds = computeEffectiveTTL(page, isgConfig);

  // Max age cap from front matter or config. validatePageISGOverrides has already rejected
  // every value extractNumericOverride would throw for.
  const maxAgeCapDays =
    extractNumericOverride(page.frontMatter.maxAgeCapDays, 'maxAgeCapDays', page.sourcePath) ??
    isgConfig.maxAgeCapDays;

  // Determine output path
  const outputPath = getOutputPath(page);

  // Build cache entry with proper optional handling
  const cacheEntry: CacheEntry = {
    path: outputPath,
    // A page that rendered with an error keeps its entry, so its output can still be pruned,
    // but never matches the inputs: the next build renders it again
    inputsHash: rendered?.failed ? STALE_INPUTS_HASH : inputsHash,
    deps,
    ...(rendered?.templates && {
      templateLookups: [...(rendered.templateLookups ?? [])],
      templatesRecorded: true,
    }),
    tags,
    renderedAt: renderedAt.toISOString(),
    ttlSeconds,
  };

  // Add optional fields only if they exist
  if (publishedAt) {
    cacheEntry.publishedAt = publishedAt;
  }

  if (maxAgeCapDays !== undefined) {
    cacheEntry.maxAgeCapDays = maxAgeCapDays;
  }

  return withRenderedAssets(cacheEntry, rendered);
}

/**
 * Updates an existing cache entry after its page rendered again: a new entry from this
 * render, keeping the original publish date when the page no longer sets one.
 *
 * @param entry - Existing cache entry
 * @param page - The page model
 * @param config - Stati configuration
 * @param renderedAt - When the page was rendered
 * @param renderInputsHash - Optional hash of asset URLs and injection settings
 * @param rendered - What the render used: templates, lookups, images and shared data
 * @returns Updated cache entry
 *
 * @example
 * ```typescript
 * const updatedEntry = await updateCacheEntry(existingEntry, page, config, new Date(), hash, rendered);
 * ```
 */
export async function updateCacheEntry(
  entry: CacheEntry,
  page: PageModel,
  config: StatiConfig,
  renderedAt: Date,
  renderInputsHash?: string,
  rendered?: RenderedAssets,
): Promise<CacheEntry> {
  const newEntry = await createCacheEntry(page, config, renderedAt, renderInputsHash, rendered);

  // Preserve original publishedAt if no new one is specified
  if (!newEntry.publishedAt && entry.publishedAt) {
    newEntry.publishedAt = entry.publishedAt;
  }

  return newEntry;
}

/**
 * Helper function to get published date as ISO string from page front matter.
 */
function getPublishedDateISO(page: PageModel): string | undefined {
  return getFrontMatterDate(page.frontMatter)?.toISOString();
}
