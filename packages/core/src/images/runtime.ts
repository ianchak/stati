/**
 * Per-build image pipeline: renders image markup while pages render, runs the jobs the
 * written pages need, recovers from failed jobs and prunes outputs no page uses.
 * @module images/runtime
 */

import { createHash } from 'node:crypto';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { URL } from 'node:url';
import type { Token } from 'markdown-it';
import {
  addBasePath,
  copyFile,
  createTemplateError,
  ensureDir,
  getBasePath,
  isPathWithinDirectory,
  listFilesRecursiveSync,
  pathExists,
  readFile,
  readFileBuffer,
  remove,
  writeFile,
} from '../core/utils/index.js';
import { resolveAbsoluteUrl } from '../seo/utils/index.js';
import { generatedOgImageTags } from '../seo/generator.js';
import {
  DEFAULT_SRC_DIR,
  DEFAULT_STATIC_DIR,
  IMAGES_OUTPUT_DIR,
  OG_IMAGES_SUBDIR,
} from '../constants.js';
import type {
  CacheManifest,
  GeneratedOgImage,
  ImageProvider,
  Logger,
  OgFont,
  OgImageFontConfig,
  PageModel,
  StatiConfig,
} from '../types/index.js';
import type { RenderedAssets } from '../core/isg/builder.js';
import {
  resolveImagesConfig,
  validateImagesConfig,
  type ResolvedImagesConfig,
  type ResolvedOgConfig,
  type ResolvedResponsiveConfig,
} from './config.js';
import { loadImageProvider, type ImageFeature } from './provider.js';
import { loadImagesManifest, saveImagesManifest, type ImagesManifest } from './manifest.js';
import {
  getSourceCacheEntries,
  inspectSourceSync,
  seedSourceCache,
  type SourceInfo,
} from './sources.js';
import { resolveImageSource, type ImageResolveContext } from './resolve.js';
import { planCopy, planVariants, type CopyPlan, type VariantPlan } from './plan.js';
import { renderImg, renderResponsiveImage, type ImgMarkupOptions } from './markup.js';
import { displayTemplatePath, inlineLocalImages, isOgImageExcluded, ogImageSlug } from './og.js';

/**
 * Bumped when the generated markup changes, so pages rendered by an older pipeline rebuild.
 */
const IMAGE_PIPELINE_VERSION = 1;

/** Host names that cannot appear in an absolute og:image URL. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

/**
 * Finds and renders a page's Open Graph template, for {@link PageImages.renderOg}. Core's
 * renderer resolves the template through the template index and renders it like any other
 * template, so it can use `stati.include()` and `stati.layout()`.
 */
export interface OgTemplateRenderer {
  /**
   * Finds the page's template by file name, such as `og.eta`: the nearest one in the page's
   * folder or a parent folder.
   *
   * @returns The template's absolute path, or null when there is none
   */
  find(templateName: string): string | null;
  /** Renders a template that `find` returned, or the source of the built-in template */
  render(template: { path: string } | { source: string }): Promise<string>;
}

/**
 * Options for `stati.image()` in templates.
 */
export interface StatiImageOptions {
  /** Alternative text; use an empty string for decorative images */
  alt?: string;
  /** `sizes` attribute for responsive images */
  sizes?: string;
  /** Load eagerly with high fetch priority, for the main image above the fold */
  priority?: boolean;
  /** `class` attribute */
  class?: string;
  /** `title` attribute */
  title?: string;
}

/** A unit of work that writes one or more files under the output directory. */
interface JobSpec {
  key: string;
  /** Output files, relative to the output directory */
  outputs: string[];
  /** Source or page, for messages */
  label: string;
  /** Absolute path of the source image, for jobs that copy or encode one */
  sourcePath?: string;
  run: () => Promise<void>;
}

/** One processed image (or Open Graph card) in a page. */
interface ImageUse {
  jobKey: string;
  outputs: string[];
  /** A URL the written page contains when it actually uses this image */
  marker: string;
  /** Markup core emitted, swapped for `fallbackMarkup` if the job fails */
  markup?: string;
  fallbackMarkup?: string;
  /** Copy the fallback markup needs, for co-located sources */
  fallbackCopy?: JobSpec;
  /** Set for Open Graph cards: their tags are removed if the job fails */
  ogImage?: GeneratedOgImage;
}

/** A page whose written HTML references generated images. */
interface PageRecord {
  outputPath: string;
  cacheKey: string;
  uses: ImageUse[];
}

/** Fonts and template for Open Graph cards, loaded once per build. */
interface OgState {
  fonts: OgFont[];
  fontsHash: string;
  defaultTemplate: string | undefined;
}

/**
 * Failures found while settling jobs.
 */
export interface SettleResult {
  /** Pages rewritten to fall back to plain images */
  patchedPages: number;
  /** Failed jobs, for reporting */
  failures: Array<{ label: string; message: string; og: boolean }>;
}

function toPosix(path: string): string {
  return path.replace(/\\/g, '/');
}

function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Checks that og:image URLs will be absolute and public.
 * @throws {Error} When `site.baseUrl` is not an absolute http(s) URL on a public host
 */
export function validateOgBaseUrl(baseUrl: string): void {
  let url: URL | undefined;
  try {
    url = new URL(baseUrl);
  } catch {
    url = undefined;
  }
  if (
    !url ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    LOCAL_HOSTS.has(url.hostname)
  ) {
    throw new Error(
      `images.og needs site.baseUrl set to your site's public address, such as https://example.com, so og:image is an absolute URL (got ${JSON.stringify(baseUrl)}).`,
    );
  }
}

async function loadOgState(
  provider: ImageProvider,
  userFonts: readonly OgImageFontConfig[],
): Promise<OgState> {
  const defaults = provider.loadOgDefaults ? await provider.loadOgDefaults() : undefined;
  const fonts: OgFont[] = [];

  for (const font of userFonts) {
    const data = await readFileBuffer(resolve(process.cwd(), font.path));
    if (!data) {
      throw new Error(`images.og.fonts: font file not found: ${font.path}`);
    }
    if (data.subarray(0, 4).toString('latin1') === 'wOF2') {
      throw new Error(
        `images.og.fonts: ${font.path} is WOFF2, which the image renderer can't read. Use a TTF, OTF or WOFF file.`,
      );
    }
    fonts.push({
      name: font.name,
      data,
      ...(font.weight !== undefined && { weight: font.weight }),
      ...(font.style !== undefined && { style: font.style }),
    });
  }
  fonts.push(...(defaults?.fonts ?? []));

  if (fonts.length === 0) {
    throw new Error('images.og needs at least one font. Add one to images.og.fonts.');
  }

  const fontsHash = sha256(
    fonts
      .map((font) => `${font.name}|${font.weight ?? ''}|${font.style ?? ''}|${sha256(font.data)}`)
      .join('\n'),
  );
  return { fonts, fontsHash, defaultTemplate: defaults?.template };
}

/**
 * Image state for one page while it renders.
 */
export class PageImages {
  /** Source files whose content affects the page */
  readonly assetDeps = new Set<string>();
  /** Processed images and cards, filtered against the written HTML when the page commits */
  readonly uses: ImageUse[] = [];
  /** The Markdown image that `eagerFirst` loads eagerly, chosen by `renderMarkdown()` */
  eagerToken: Token | undefined;
  private readonly context: ImageResolveContext;

  constructor(
    private readonly runtime: ImageRuntime,
    readonly page: PageModel,
  ) {
    this.context = {
      pageSourcePath: page.sourcePath,
      srcDir: runtime.srcDir,
      staticDir: runtime.staticDir,
    };
  }

  /**
   * Renders a Markdown image token.
   *
   * @returns The markup, or the `src` to give markdown-it's default renderer when the image
   *   is left as authored
   */
  renderMarkdownImage(token: Token, alt: string): { html: string } | { src: string } {
    // markdown-it types attribute values as string | number; Stati handles them as text
    const attributes = (token.attrs ?? [])
      .filter(([name]) => !['src', 'alt', 'title', 'width', 'height'].includes(name.toLowerCase()))
      .map(([name, value]): [string, string] => [name, String(value)]);
    return this.renderImage(token.attrGet('src')?.toString() ?? '', {
      alt,
      title: token.attrGet('title')?.toString(),
      attributes,
      width: token.attrGet('width') ?? undefined,
      height: token.attrGet('height') ?? undefined,
      eager: this.runtime.settings.eagerFirst && token === this.eagerToken,
    });
  }

  /**
   * Implements `stati.image(src, options)` for templates. Synchronous, because templates
   * print its result directly.
   */
  renderHelperImage(src: unknown, options: StatiImageOptions = {}): string {
    if (typeof src !== 'string' || !src.trim()) {
      return '';
    }
    if (options.alt === undefined) {
      this.runtime.warnOnce(
        `alt:${this.page.url}:${src}`,
        `stati.image('${src}') on ${this.page.url} has no alt text. Pass { alt: '' } for decorative images.`,
      );
    }
    const markupOptions = {
      alt: options.alt ?? '',
      title: options.title,
      attributes: options.class ? ([['class', options.class]] as const) : undefined,
      eager: options.priority === true,
      sizes: options.sizes,
    };
    const result = this.renderImage(src, markupOptions);
    return 'html' in result ? result.html : renderImg(result.src, markupOptions);
  }

  private renderImage(
    rawSrc: string,
    options: Omit<ImgMarkupOptions, 'srcset'> & { sizes?: string | undefined },
  ): { html: string } | { src: string } {
    const resolved = resolveImageSource(rawSrc, this.context);
    const basePath = this.runtime.basePath;
    // A site path as the browser requests it; other values stay as written
    const asWritten = addBasePath(resolved.src, basePath);
    if (resolved.kind === 'skip') {
      return { src: asWritten };
    }

    const filePath = resolved.filePath;
    this.assetDeps.add(toPosix(filePath));
    const info = this.runtime.inspect(filePath);
    const shownPath = toPosix(relative(process.cwd(), filePath));
    if (!info) {
      this.runtime.warnOnce(
        `missing:${filePath}`,
        `Image not found: ${shownPath} (used by ${this.page.url}). It is left as written.`,
      );
      return { src: asWritten };
    }
    if (!info.probe) {
      this.runtime.warnOnce(
        `unreadable:${filePath}`,
        `Could not read the dimensions of ${shownPath}. It is left as written.`,
      );
      return { src: asWritten };
    }

    const probe = info.probe;
    const base: ImgMarkupOptions = {
      ...options,
      width: options.width ?? probe.width,
      height: options.height ?? probe.height,
    };

    let tier1Src = asWritten;
    let copy: CopyPlan | undefined;
    if (resolved.kind === 'colocated') {
      copy = planCopy(filePath, info.hash, probe.format, basePath);
      tier1Src = copy.url;
    }
    const tier1Markup = renderImg(tier1Src, base);

    const responsive = this.runtime.responsive;
    const provider = this.runtime.provider;
    if (responsive && provider && !probe.animated) {
      const plan = planVariants({
        filePath,
        sourceHash: info.hash,
        format: probe.format,
        width: probe.width,
        responsive,
        providerVersion: provider.version,
        basePath,
      });
      const markup = renderResponsiveImage(plan, base, options.sizes ?? responsive.sizes);
      this.runtime.registerJob(this.runtime.variantJob(plan, filePath));
      this.uses.push({
        jobKey: plan.key,
        outputs: plan.outputs.map((output) => output.relPath),
        marker: plan.fallback.src,
        markup,
        fallbackMarkup: tier1Markup,
        ...(copy && { fallbackCopy: this.runtime.copyJob(copy, filePath) }),
      });
      return { html: markup };
    }

    if (copy) {
      const job = this.runtime.copyJob(copy, filePath);
      this.runtime.registerJob(job);
      this.uses.push({ jobKey: job.key, outputs: [copy.relPath], marker: copy.url });
    }
    return { html: tier1Markup };
  }

  /**
   * Whether this page gets a generated Open Graph image.
   */
  wantsOg(): boolean {
    const { og, ogState, provider } = this.runtime;
    return Boolean(
      og && ogState && provider?.renderOgImage && !isOgImageExcluded(this.page, og.exclude),
    );
  }

  /**
   * Size of the page's Open Graph image, exposed to the template as `stati.og`.
   */
  ogSize(): { width: number; height: number } | undefined {
    const og = this.runtime.og;
    return og ? { width: og.width, height: og.height } : undefined;
  }

  /**
   * Renders this page's Open Graph template and registers the card.
   *
   * @param renderer - Finds the page's template and renders it, or the built-in template, with
   *   the layout's values, an empty body and `stati.og`
   * @returns The generated image, or null when the page gets none
   */
  async renderOg(renderer: OgTemplateRenderer): Promise<GeneratedOgImage | null> {
    const { og, ogState, provider } = this.runtime;
    if (!og || !ogState || !provider?.renderOgImage) return null;
    if (isOgImageExcluded(this.page, og.exclude)) return null;

    const srcDir = this.runtime.srcDir;
    const templatePath = renderer.find(og.template);
    if (!templatePath && !ogState.defaultTemplate) return null;
    const templateLabel = templatePath
      ? displayTemplatePath(templatePath)
      : 'built-in Open Graph template';

    let html: string;
    try {
      html = await renderer.render(
        templatePath ? { path: templatePath } : { source: ogState.defaultTemplate! },
      );
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      if (this.runtime.development) {
        throw createTemplateError(failure, templatePath ?? undefined);
      }
      this.runtime.logger.error(
        `Failed to render ${templateLabel} for ${this.page.url}: ${failure.message}`,
      );
      return null;
    }

    const inlined = await inlineLocalImages(
      html,
      {
        staticDir: this.runtime.staticDir,
        baseDir: templatePath ? dirname(templatePath) : srcDir,
        srcDir,
        basePath: this.runtime.basePath,
      },
      (path) => this.runtime.generatedSourceFor(path),
    );
    for (const file of inlined.files) this.assetDeps.add(file);

    const key = sha256(
      JSON.stringify({
        html: inlined.html,
        width: og.width,
        height: og.height,
        format: og.format,
        fonts: ogState.fontsHash,
        provider: provider.version,
      }),
    );
    const extension = og.format === 'jpeg' ? 'jpg' : 'png';
    const slug = ogImageSlug(this.page.url);
    const relPath = posix.join(
      IMAGES_OUTPUT_DIR,
      OG_IMAGES_SUBDIR,
      `${slug}-${key.slice(0, 8)}.${extension}`,
    );
    const path = `/${relPath}`;
    const title = this.page.frontMatter.title;
    const image: GeneratedOgImage = {
      url: resolveAbsoluteUrl(path, this.runtime.baseUrl),
      path,
      width: og.width,
      height: og.height,
      ...(typeof title === 'string' && title && { alt: title }),
    };

    // The slug is part of the key: pages that draw the same card each get their own file
    const jobKey = `og:${slug}:${key}`;
    const filePath = join(this.runtime.outDir, relPath);
    const render = provider.renderOgImage.bind(provider);
    this.runtime.registerJob({
      key: jobKey,
      outputs: [relPath],
      label: `${templateLabel} (${this.page.url})`,
      run: () =>
        render({
          html: inlined.html,
          width: og.width,
          height: og.height,
          format: og.format,
          fonts: ogState.fonts,
          filePath,
          templatePath: templateLabel,
        }),
    });
    this.uses.push({ jobKey, outputs: [relPath], marker: path, ogImage: image });
    return image;
  }
}

/**
 * Options for {@link ImageRuntime.create}.
 */
export interface ImageRuntimeOptions {
  /** Absolute output directory */
  outDir: string;
  /** Absolute cache directory (`.stati`) */
  cacheDir: string;
  logger: Logger;
  /** True for dev server builds */
  development: boolean;
}

/**
 * The image pipeline for one build.
 */
export class ImageRuntime {
  /** Responsive options in effect for this build; null when off or skipped in dev */
  readonly responsive: ResolvedResponsiveConfig | null;
  /** Open Graph options in effect for this build; null when off or skipped in dev */
  readonly og: ResolvedOgConfig | null;
  /** Counters for the build summary and metrics */
  readonly stats = { generated: 0, cached: 0, failed: 0 };
  /** The path the site is served from, which every image URL starts with */
  readonly basePath: string;

  private readonly specs = new Map<string, JobSpec>();
  /** Source file of each generated image registered this build, by URL path */
  private readonly generatedSources = new Map<string, string>();
  private readonly jobs = new Map<string, Promise<void>>();
  private readonly failures = new Map<string, Error>();
  private readonly records: PageRecord[] = [];
  private readonly touched = new Set<string>();
  private readonly warned = new Set<string>();
  /** Whether the images manifest changed and needs saving */
  private dirty = false;

  private constructor(
    readonly settings: ResolvedImagesConfig,
    readonly provider: ImageProvider | null,
    readonly ogState: OgState | null,
    private readonly manifest: ImagesManifest,
    private readonly existing: Set<string>,
    readonly srcDir: string,
    readonly staticDir: string,
    readonly outDir: string,
    private readonly cacheDir: string,
    readonly baseUrl: string,
    readonly logger: Logger,
    readonly development: boolean,
    generate: boolean,
  ) {
    this.basePath = getBasePath(baseUrl);
    this.responsive = generate ? settings.responsive : null;
    this.og = generate && ogState ? settings.og : null;
  }

  /**
   * Creates the pipeline for a build.
   *
   * @returns The runtime, or null when images are turned off with `images: false`
   * @throws {ConfigValidationError} When the `images` block is invalid
   * @throws {Error} When a feature needs `@stati/images` and it is missing or incompatible,
   *   or when an Open Graph font or `site.baseUrl` is unusable
   */
  static async create(
    config: StatiConfig,
    options: ImageRuntimeOptions,
  ): Promise<ImageRuntime | null> {
    validateImagesConfig(config.images);
    const settings = resolveImagesConfig(config.images);
    if (!settings) return null;

    const generate = !options.development || settings.dev === 'full';
    const features: ImageFeature[] = [];
    if (settings.responsive) features.push('responsive');
    if (settings.og) features.push('og');

    // The package must be installed whenever a feature is on, even when dev skips it
    const provider =
      features.length > 0 ? await loadImageProvider({ features, load: generate }) : null;

    let ogState: OgState | null = null;
    if (generate && settings.og && provider) {
      if (!options.development) {
        validateOgBaseUrl(config.site.baseUrl);
      }
      ogState = await loadOgState(provider, settings.og.fonts);
    }

    const manifest = await loadImagesManifest(options.cacheDir);
    seedSourceCache(manifest.sources);
    const existing = new Set(
      listFilesRecursiveSync(join(options.outDir, IMAGES_OUTPUT_DIR)).map(
        (file) => `${IMAGES_OUTPUT_DIR}/${file}`,
      ),
    );

    const srcDir = join(process.cwd(), config.srcDir || DEFAULT_SRC_DIR);
    const staticDir = join(process.cwd(), config.staticDir || DEFAULT_STATIC_DIR);
    if (await pathExists(join(staticDir, IMAGES_OUTPUT_DIR))) {
      options.logger.warning(
        `${toPosix(relative(process.cwd(), join(staticDir, IMAGES_OUTPUT_DIR)))} shares its URL with generated images (/${IMAGES_OUTPUT_DIR}/). Move those files to another folder.`,
      );
    }

    return new ImageRuntime(
      settings,
      provider,
      ogState,
      manifest,
      existing,
      srcDir,
      staticDir,
      options.outDir,
      options.cacheDir,
      config.site.baseUrl,
      options.logger,
      options.development,
      generate,
    );
  }

  /**
   * Settings that change generated HTML, added to every page's render-inputs hash.
   */
  fingerprint(): Record<string, unknown> {
    const hasFeatures = this.settings.responsive !== null || this.settings.og !== null;
    return {
      version: IMAGE_PIPELINE_VERSION,
      eagerFirst: this.settings.eagerFirst,
      ...(hasFeatures && { generate: this.responsive !== null || this.og !== null }),
      ...(this.responsive && { responsive: this.responsive }),
      ...(this.og &&
        this.ogState && {
          og: {
            template: this.og.template,
            width: this.og.width,
            height: this.og.height,
            format: this.og.format,
            exclude: this.og.exclude,
            fonts: this.ogState.fontsHash,
          },
        }),
      ...(this.provider && { provider: this.provider.version }),
    };
  }

  /**
   * Creates the image state for a page about to render.
   */
  createPageContext(page: PageModel): PageImages {
    return new PageImages(this, page);
  }

  /**
   * Whether every generated file a cached page references still exists.
   */
  outputsExist(images: readonly string[] | undefined): boolean {
    return (images ?? []).every((image) => this.existing.has(image));
  }

  /**
   * Records a written page and starts the jobs for the images its HTML actually contains.
   *
   * @param pageImages - The page's image state
   * @param html - The final HTML of the page
   * @param info - Output path and cache key of the page
   * @returns The files to record on the page's cache entry
   */
  commitPage(
    pageImages: PageImages,
    html: string,
    info: { outputPath: string; cacheKey: string },
  ): RenderedAssets {
    // A template can render an image and then discard the output, so keep only images the
    // written page really shows
    const used = pageImages.uses.filter((use) => html.includes(use.marker));
    for (const use of used) {
      this.startJob(use.jobKey);
    }
    if (used.length > 0) {
      this.records.push({ ...info, uses: used });
    }
    return {
      assetDeps: [...pageImages.assetDeps].sort(),
      images: [...new Set(used.flatMap((use) => use.outputs))].sort(),
    };
  }

  /**
   * Waits for every job, then rewrites pages whose images failed so they show plain images,
   * and marks those pages stale so the next build retries.
   *
   * @param cacheManifest - The ISG manifest, updated in place
   */
  async settle(cacheManifest: CacheManifest): Promise<SettleResult> {
    await Promise.all(this.jobs.values());
    const failures: SettleResult['failures'] = [];
    if (this.failures.size === 0) {
      return { patchedPages: 0, failures };
    }

    for (const [key, error] of this.failures) {
      const spec = this.specs.get(key);
      failures.push({
        label: spec?.label ?? key,
        message: error.message,
        og: key.startsWith('og:'),
      });
    }

    let patchedPages = 0;
    for (const record of this.records) {
      const failed = record.uses.filter((use) => this.failures.has(use.jobKey));
      if (failed.length === 0) continue;

      const html = await readFile(record.outputPath);
      if (html === null) continue;
      let patched = html;
      const removed = new Set<string>();
      const added = new Set<string>();

      for (const use of failed) {
        use.outputs.forEach((output) => removed.add(output));
        if (use.fallbackCopy) {
          this.registerJob(use.fallbackCopy);
          this.startJob(use.fallbackCopy.key);
          await this.jobs.get(use.fallbackCopy.key);
          if (!this.failures.has(use.fallbackCopy.key)) {
            use.fallbackCopy.outputs.forEach((output) => added.add(output));
          }
        }
        if (use.markup !== undefined && use.fallbackMarkup !== undefined) {
          patched = patched.split(use.markup).join(use.fallbackMarkup);
        }
        if (use.ogImage) {
          const tags = generatedOgImageTags(use.ogImage);
          for (const tag of [...tags.openGraph, ...tags.twitter]) {
            patched = patched.split(tag).join('');
          }
        }
      }

      if (patched !== html) {
        await writeFile(record.outputPath, patched, 'utf-8');
      }

      const entry = cacheManifest.entries[record.cacheKey];
      if (entry) {
        const { images: previous, ...rest } = entry;
        const images = [
          ...new Set([...(previous ?? []).filter((image) => !removed.has(image)), ...added]),
        ].sort();
        cacheManifest.entries[record.cacheKey] = {
          ...rest,
          inputsHash: 'STALE',
          ...(images.length > 0 && { images }),
        };
      }
      patchedPages++;
    }

    for (const failure of failures) {
      this.logger.warning(
        `Image generation failed for ${failure.label}: ${failure.message}. ${
          failure.og ? 'The page has no generated og:image' : 'Pages show the original image'
        } until the next build.`,
      );
    }
    return { patchedPages, failures };
  }

  /**
   * Saves the images manifest.
   */
  async save(): Promise<void> {
    if (!this.dirty && this.touched.size === 0) return;
    this.manifest.sources = getSourceCacheEntries(
      new Set([...Object.keys(this.manifest.sources), ...this.touched]),
    );
    await saveImagesManifest(this.cacheDir, this.manifest);
    this.dirty = false;
  }

  /**
   * Deletes generated files no page of this build references. Only files recorded in the
   * images manifest are ever deleted.
   *
   * @param liveImages - Generated files referenced by this build's pages
   * @param liveSources - Source files referenced by this build's pages
   * @returns Number of files deleted
   */
  async prune(liveImages: ReadonlySet<string>, liveSources: ReadonlySet<string>): Promise<number> {
    const imagesDir = join(this.outDir, IMAGES_OUTPUT_DIR);
    let removedFiles = 0;
    let changed = false;

    for (const [key, record] of Object.entries(this.manifest.outputs)) {
      if (record.files.some((file) => liveImages.has(file))) continue;
      for (const file of record.files) {
        const filePath = join(this.outDir, file);
        if (isPathWithinDirectory(imagesDir, filePath) && (await pathExists(filePath))) {
          await remove(filePath);
          removedFiles++;
        }
      }
      delete this.manifest.outputs[key];
      changed = true;
    }

    for (const path of Object.keys(this.manifest.sources)) {
      if (!liveSources.has(path)) {
        delete this.manifest.sources[path];
        changed = true;
      }
    }

    if (changed) {
      await saveImagesManifest(this.cacheDir, this.manifest);
    }
    return removedFiles;
  }

  /**
   * Inspects a source image and remembers it for the manifest.
   */
  inspect(filePath: string): SourceInfo | null {
    this.touched.add(toPosix(filePath));
    return inspectSourceSync(filePath);
  }

  /**
   * Logs a warning once per build.
   */
  warnOnce(key: string, message: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.logger.warning(message);
  }

  /**
   * Registers a job. It only runs once a written page references its outputs.
   */
  registerJob(spec: JobSpec): void {
    if (!this.specs.has(spec.key)) {
      this.specs.set(spec.key, spec);
    }
    if (spec.sourcePath) {
      for (const output of spec.outputs) this.generatedSources.set(`/${output}`, spec.sourcePath);
    }
  }

  /**
   * The source file of an image this build generates, by its URL path, such as
   * `/_img/hero-1a2b3c4d-960.webp`.
   */
  generatedSourceFor(path: string): string | undefined {
    return this.generatedSources.get(path);
  }

  /**
   * Job that copies a co-located image to its hashed URL.
   */
  copyJob(plan: CopyPlan, sourcePath: string): JobSpec {
    const target = join(this.outDir, plan.relPath);
    return {
      key: plan.key,
      outputs: [plan.relPath],
      label: toPosix(relative(process.cwd(), sourcePath)),
      sourcePath,
      run: () => copyFile(sourcePath, target),
    };
  }

  /**
   * Job that encodes the responsive variants of an image.
   */
  variantJob(plan: VariantPlan, sourcePath: string): JobSpec {
    const provider = this.provider!;
    return {
      key: plan.key,
      outputs: plan.outputs.map((output) => output.relPath),
      label: toPosix(relative(process.cwd(), sourcePath)),
      sourcePath,
      run: () =>
        provider.createVariants({
          sourcePath,
          outputs: plan.outputs.map((output) => ({
            filePath: join(this.outDir, output.relPath),
            width: output.width,
            format: output.format,
            ...(output.quality !== undefined && { quality: output.quality }),
          })),
        }),
    };
  }

  private startJob(key: string): void {
    if (this.jobs.has(key)) return;
    const spec = this.specs.get(key);
    if (!spec) return;

    if (this.manifest.outputs[key] && spec.outputs.every((output) => this.existing.has(output))) {
      this.stats.cached++;
      this.jobs.set(key, Promise.resolve());
      return;
    }

    const promise = (async () => {
      for (const dir of new Set(spec.outputs.map((output) => dirname(join(this.outDir, output))))) {
        await ensureDir(dir);
      }
      await spec.run();
      this.manifest.outputs[key] = { files: [...spec.outputs] };
      this.dirty = true;
      for (const output of spec.outputs) this.existing.add(output);
      this.stats.generated++;
    })().catch(async (error: unknown) => {
      this.failures.set(key, error instanceof Error ? error : new Error(String(error)));
      this.stats.failed++;
      // Outputs this run wrote before failing are recorded nowhere, so pruning would never
      // remove them. Files that existed when the build started stay: cached pages may show them.
      await Promise.all(
        spec.outputs
          .filter((output) => !this.existing.has(output))
          .map((output) => remove(join(this.outDir, output)).catch(() => undefined)),
      );
    });
    this.jobs.set(key, promise);
  }
}
