/**
 * Per-build stylesheet lifecycle: the stylesheet Stati builds with Tailwind CSS and the static
 * directory's stylesheets production pages link under hashed names. It gives pages the path
 * they render with, points their links at hashed names, holds a production build's pages until
 * Tailwind has run, then builds the stylesheet, writes the held pages, relinks cached pages and
 * deletes the hashed copies earlier builds left behind.
 * @module css/runtime
 */

import { dirname, join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  ensureDir,
  getBasePath,
  getPageOutputFile,
  readFile,
  remove,
  resolveStaticDir,
  writeFile,
} from '../core/utils/index.js';
import { formatBytes } from '../core/utils/typescript.utils.js';
import { CSS_OUT_DIR, MAX_DEFERRED_PAGES_LENGTH } from '../constants.js';
import type { CacheManifest, Logger, PageModel, StatiConfig } from '../types/index.js';
import type { MetricRecorder } from '../metrics/index.js';
import { resolveCSSConfig } from './config.js';
import { StaticStylesheets } from './static.js';
import {
  autoInjectStylesheets,
  buildStylesheet,
  checkStylesheetSources,
  createStylesheetPlan,
  getLinkedStylesheetPaths,
  getRenderStylesheetPath,
  getStaleStylesheetPaths,
  getStylesheetFingerprint,
  isHashableStylesheetPath,
  linksStylesheetWithIntegrity,
  relinkStylesheets,
  removeStaleStylesheets,
  rewriteStylesheetLinks,
  type BuiltStylesheet,
  type StylesheetPlan,
  type TailwindBuildOptions,
} from './stylesheet.js';

/** The folder in the cache directory for pages a production build holds past its memory limit */
export const STAGED_PAGES_DIR = 'pending-pages';

/** Pages written at once */
const WRITE_BATCH_SIZE = 32;

/**
 * A rendered page and the file it goes to. Its HTML is in memory, or past the memory limit in
 * a staged file in the cache directory, so the output directory keeps the previous build's
 * page until the stylesheet is built.
 */
export type DeferredPage =
  { outputPath: string; content: string } | { outputPath: string; stagedFile: string };

/**
 * Writes held pages in batches, with one stylesheet path swapped for another.
 *
 * @param pages - The held pages
 * @param from - The stylesheet path the pages rendered with
 * @param to - The path they get
 * @throws {Error} When a staged page is missing from the cache directory
 */
export async function writeDeferredPages(
  pages: readonly DeferredPage[],
  from: string,
  to: string,
): Promise<void> {
  await Promise.all([...new Set(pages.map((page) => dirname(page.outputPath)))].map(ensureDir));
  for (let i = 0; i < pages.length; i += WRITE_BATCH_SIZE) {
    await Promise.all(
      pages.slice(i, i + WRITE_BATCH_SIZE).map(async (page) => {
        const content = 'content' in page ? page.content : await readFile(page.stagedFile);
        if (content === null) {
          throw new Error(
            `A rendered page is missing from the cache directory: ${page.outputPath}`,
          );
        }
        await writeFile(
          page.outputPath,
          from === to ? content : content.split(from).join(to),
          'utf-8',
        );
      }),
    );
  }
}

/** The stylesheet settings a page's render-inputs hash covers */
export interface StylesheetRenderInputs {
  /** The Tailwind stylesheet's path and settings, without its hashed name */
  stylesheet?: ReturnType<typeof getStylesheetFingerprint>;
  /** Set when production links the static directory's stylesheets under hashed names */
  hashedStylesheets?: true;
}

/** Options for {@link StylesheetRuntime.create}. */
export interface StylesheetRuntimeOptions {
  /** The Tailwind CSS input and output (`--tailwind-input`, `--tailwind-output`), if any */
  tailwind?: TailwindBuildOptions | undefined;
  /** The output directory, absolute */
  outDir: string;
  /** The cache directory (`.stati`), absolute */
  cacheDir: string;
  logger: Logger;
  recorder: MetricRecorder;
  /** True for dev server builds, which never hash, hold pages or run Tailwind */
  development: boolean;
  /** The folder the Tailwind paths are relative to and Tailwind runs in */
  projectRoot?: string;
}

/**
 * The stylesheets of one build. Call its steps in this order: {@link create} first, so a bad
 * `--tailwind-output` or a missing Tailwind input fails the build before `--clean` deletes
 * anything, {@link linkPage} and {@link hold} for each page that renders,
 * {@link finalize} once the Tailwind class inventory is written and before stale pages are
 * pruned and image failures patched, which read the written pages, and {@link removeStale} in
 * production once the cache manifest is saved.
 */
export class StylesheetRuntime {
  /** The stylesheet Stati builds with Tailwind, or null without `--tailwind-input` */
  readonly plan: StylesheetPlan | null;
  /**
   * The Tailwind stylesheet's path pages render with: its own path, or in a hashed build a name
   * made up for this build, which {@link finalize} replaces with the hashed one
   */
  readonly renderPath: string | undefined;
  /** Whether pages are held until {@link finalize}, as a production build with Tailwind does */
  readonly holdsPages: boolean;

  /** The Tailwind stylesheet and the path pages render with, or null without one */
  private readonly tailwind: { plan: StylesheetPlan; renderPath: string } | null;
  /** The settings that decide the pages' stylesheet links, for their cache hash */
  private readonly renderInputs: StylesheetRenderInputs;
  /** The Tailwind stylesheet's path and the name links to it get in a hashed build */
  private readonly tailwindTargets: ReadonlyMap<string, string>;
  /** The names links get, which a page that links them already needs no copy for */
  private readonly hashedNames: Set<string>;
  /**
   * Stylesheet paths pages link that the static directory has no file for, such as one added
   * later; the build records them, so pages kept from now on link its copy once it exists
   */
  private readonly unhashedLinks = new Set<string>();
  private held: DeferredPage[] = [];
  private heldLength = 0;
  /** The stylesheet paths the last production build linked, which pages kept from it carry */
  private previous: Record<string, string> = {};

  private constructor(
    plan: StylesheetPlan | null,
    private readonly statics: StaticStylesheets | null,
    private readonly config: StatiConfig,
    private readonly outDir: string,
    private readonly cacheDir: string,
    private readonly stagingDir: string,
    private readonly projectRoot: string,
    private readonly logger: Logger,
    private readonly recorder: MetricRecorder,
    private readonly development: boolean,
  ) {
    this.tailwind = plan && { plan, renderPath: getRenderStylesheetPath(plan) };
    this.plan = plan;
    this.renderPath = this.tailwind?.renderPath;
    this.holdsPages = !development && plan !== null;
    this.renderInputs = {
      ...(plan && { stylesheet: getStylesheetFingerprint(plan) }),
      // Production links hashed stylesheets, which development doesn't
      ...(statics && { hashedStylesheets: true }),
    };
    this.tailwindTargets = new Map(
      this.tailwind?.plan.hash ? [[this.tailwind.plan.path, this.tailwind.renderPath]] : [],
    );
    this.hashedNames = new Set(this.tailwindTargets.values());
  }

  /**
   * Sets up the stylesheets of a build. A production build with Tailwind checks the input and
   * the Tailwind CLI, so a missing one fails before any page renders, and deletes the pages an
   * earlier build that stopped before writing them left in the cache directory.
   *
   * @param config - The site's config
   * @param options - The Tailwind files, directories and mode of the build
   * @throws {Error} When `--tailwind-output` is not a .css file in the output directory, or in
   *   production when the Tailwind input is missing or Tailwind CSS is not installed
   */
  static async create(
    config: StatiConfig,
    options: StylesheetRuntimeOptions,
  ): Promise<StylesheetRuntime> {
    const { tailwind, outDir, cacheDir, logger, recorder, development } = options;
    const projectRoot = options.projectRoot ?? process.cwd();
    const plan = tailwind
      ? createStylesheetPlan(tailwind, config.css, outDir, development, projectRoot)
      : null;
    const stagingDir = join(cacheDir, STAGED_PAGES_DIR);
    if (plan && !development) {
      await checkStylesheetSources(plan, projectRoot);
      await remove(stagingDir);
    }

    const basePath = getBasePath(config.site.baseUrl);
    // Production links the static directory's stylesheets under hashed names, unless css.hash
    // is false. The Tailwind output's path is Tailwind's, so a static file there isn't one.
    const statics = resolveCSSConfig(config.css, development).hash
      ? new StaticStylesheets(resolveStaticDir(config), outDir, plan?.path, basePath)
      : null;

    return new StylesheetRuntime(
      plan,
      statics,
      config,
      outDir,
      cacheDir,
      stagingDir,
      projectRoot,
      logger,
      recorder,
      development,
    );
  }

  /**
   * The stylesheet settings every page's render-inputs hash covers. A hashed build's file name
   * is not among them: it is known only after the pages render, and {@link finalize} writes it
   * into cached pages too.
   *
   * @returns An object to spread into the render inputs, empty without a stylesheet to link
   */
  fingerprint(): StylesheetRenderInputs {
    return { ...this.renderInputs };
  }

  /** A page's `stati.assets.stylesheetPaths`: a new array each call, which the page can change */
  stylesheetPaths(): string[] {
    return this.renderPath ? [this.renderPath] : [];
  }

  /**
   * Points a rendered page's stylesheet links at the names this build gives them: in production,
   * a link to the Tailwind output's path at the name this build gives it and a link to a
   * stylesheet in the static directory at its hashed copy, which the first page that links it
   * writes. With Tailwind, unless `css.autoInject` is false, it then adds a link for each of the
   * page's stylesheet paths the page doesn't link yet. A path a template added to them can be a
   * stylesheet from the static directory, so an added link is pointed at its copy too.
   *
   * @param html - The rendered page, after SEO and search tags are added
   * @param pageUrl - The page's URL, which relative links resolve against
   * @param stylesheetPaths - The page's `stati.assets.stylesheetPaths` after it rendered
   * @returns The page with its stylesheet links
   * @throws {Error} When a hashed build's page links the Tailwind output with an integrity
   *   digest, or a static stylesheet it links references the Tailwind output
   */
  async linkPage(
    html: string,
    pageUrl: string,
    stylesheetPaths: readonly string[],
  ): Promise<string> {
    const plan = this.plan;
    // A hashed build writes the Tailwind stylesheet under its hashed name only, so a link that
    // keeps the stylesheet's own path for its integrity digest would load nothing
    if (plan?.hash && linksStylesheetWithIntegrity(html, plan.path, pageUrl, this.siteUrl)) {
      throw new Error(
        `The page ${pageUrl} links ${plan.path} with an integrity attribute. A hashed build writes the Tailwind stylesheet only as /${CSS_OUT_DIR}/${plan.name}-[hash].css, which the link can't load. Remove the integrity attribute, or set css.hash to false.`,
      );
    }

    const statics = this.statics;
    let linked = statics ? await this.linkHashedStylesheets(statics, html, pageUrl) : html;
    if (plan?.autoInject) {
      const injected = autoInjectStylesheets(linked, stylesheetPaths, this.siteUrl, pageUrl);
      linked =
        statics && injected !== linked
          ? await this.linkHashedStylesheets(statics, injected, pageUrl)
          : injected;
    }
    return linked;
  }

  /**
   * Keeps a rendered page until {@link finalize} has built the stylesheet, so a Tailwind error
   * leaves the previous build's pages in place and a hashed build writes each page once, with
   * the stylesheet's final name. Pages past `MAX_DEFERRED_PAGES_LENGTH` go to the cache
   * directory, never the output directory.
   *
   * @param outputPath - The page's output file
   * @param html - The page
   */
  async hold(outputPath: string, html: string): Promise<void> {
    if (this.heldLength + html.length <= MAX_DEFERRED_PAGES_LENGTH) {
      this.held.push({ outputPath, content: html });
      this.heldLength += html.length;
      return;
    }
    const stagedFile = join(this.stagingDir, `${this.held.length}.html`);
    await ensureDir(this.stagingDir);
    await writeFile(stagedFile, html, 'utf-8');
    this.held.push({ outputPath, stagedFile });
  }

  /**
   * Finishes the stylesheets once every page has rendered and the Tailwind class inventory lists
   * every class they use. A production build with Tailwind runs it and writes the held pages
   * with the stylesheet's name. A hashed build then gives every stylesheet it links a name, the
   * Tailwind output and the static stylesheets a hashed one each and a path pages link that the
   * static directory has no file for its own, points cached pages at those names and records
   * them in `manifest.stylesheets`. Pages kept from earlier builds carry the names those builds
   * gave, so the stylesheets only they link are looked up again: a changed file gets a new name,
   * a removed one its own path back, and one added since its copy. Nothing is rendered again.
   *
   * @param manifest - The cache manifest, whose `stylesheets` this updates
   * @param pages - Every page of the build
   * @param renderedFiles - The output files of the pages this build rendered
   * @throws {Error} When Tailwind CSS fails, or a held page is gone from the cache directory
   */
  async finalize(
    manifest: CacheManifest,
    pages: readonly PageModel[],
    renderedFiles: readonly string[],
  ): Promise<void> {
    this.previous = manifest.stylesheets ?? {};
    const built =
      this.tailwind && !this.development ? await this.buildTailwindStylesheet(this.tailwind) : null;

    if (this.statics) {
      await this.relink(manifest, this.statics, pages, renderedFiles, built);
    } else if (!this.development) {
      delete manifest.stylesheets;
    }
  }

  /**
   * Deletes the hashed copies earlier builds wrote other than the ones this build links, now
   * that every page links this build's names. A stylesheet this build doesn't hash, after a
   * change of `--tailwind-output`, without the flags or with `css.hash` false, loses every copy:
   * its pages linked the new name in {@link finalize} or were rendered again. Production only.
   *
   * @param manifest - The cache manifest, after {@link finalize}
   */
  async removeStale(manifest: CacheManifest): Promise<void> {
    const current = manifest.stylesheets ?? {};
    const paths = new Set([
      ...Object.keys(this.previous),
      ...Object.keys(current),
      ...(this.plan ? [this.plan.path] : []),
    ]);
    for (const path of paths) {
      await removeStaleStylesheets(this.outDir, path, current[path]);
    }
  }

  /**
   * The site's base URL, read on each use: a `beforeAll` hook can change it after the runtime
   * is created, and the pages render with the one it leaves
   */
  private get siteUrl(): string {
    return this.config.site.baseUrl;
  }

  private async linkHashedStylesheets(
    statics: StaticStylesheets,
    html: string,
    pageUrl: string,
  ): Promise<string> {
    const targets = new Map(this.tailwindTargets);
    for (const path of getLinkedStylesheetPaths(html, pageUrl, this.siteUrl)) {
      if (targets.has(path) || this.hashedNames.has(path)) {
        continue;
      }
      const copy = await statics.resolve(path);
      if (copy !== undefined) {
        targets.set(path, copy);
        this.hashedNames.add(copy);
      } else if (isHashableStylesheetPath(path)) {
        this.unhashedLinks.add(path);
      }
    }
    return rewriteStylesheetLinks(html, targets, pageUrl, this.siteUrl);
  }

  /**
   * Runs Tailwind now that the inventory lists every class the pages use, then writes the pages
   * this build held, with the stylesheet's name.
   */
  private async buildTailwindStylesheet({
    plan,
    renderPath,
  }: {
    plan: StylesheetPlan;
    renderPath: string;
  }): Promise<BuiltStylesheet> {
    const endStylesheetSpan = this.recorder.startSpan('tailwindBuildMs');
    this.logger.info('');
    this.logger.info('Building CSS with Tailwind CSS...');
    let built: BuiltStylesheet;
    try {
      built = await buildStylesheet(
        plan,
        this.outDir,
        this.cacheDir,
        this.projectRoot,
        getBasePath(this.siteUrl),
      );
      if (this.logger.file) {
        this.logger.file(
          'compiled',
          relative(this.outDir, built.file).replace(/\\/g, '/'),
          built.sizeInBytes,
        );
      }

      const fileWriteStart = performance.now();
      await writeDeferredPages(this.held, renderPath, built.path);
      this.recorder.addToPhase('fileWriteTotalMs', performance.now() - fileWriteStart);
    } finally {
      await remove(this.stagingDir);
    }
    // Let go of the held HTML
    this.held = [];
    this.heldLength = 0;
    endStylesheetSpan();
    this.logger.success(`Built ${built.path} (${formatBytes(built.sizeInBytes)})`);
    return built;
  }

  private async relink(
    manifest: CacheManifest,
    statics: StaticStylesheets,
    pages: readonly PageModel[],
    renderedFiles: readonly string[],
    built: BuiltStylesheet | null,
  ): Promise<void> {
    const rendered = new Set(renderedFiles);
    const cachedPages = pages
      .map((page) => ({ file: join(this.outDir, getPageOutputFile(page.url)), url: page.url }))
      .filter(({ file }) => !rendered.has(file));

    const current = await statics.hashed();
    if (this.plan?.hash && built) {
      current.set(this.plan.path, built.path);
    }
    // Never a path with a copy: looking it up found no file
    for (const path of this.unhashedLinks) {
      current.set(path, path);
    }
    // Every page rendered again links only what this build found
    if (cachedPages.length > 0) {
      for (const path of Object.keys(this.previous)) {
        if (!current.has(path)) {
          current.set(path, (await statics.resolve(path)) ?? path);
        }
      }
    }

    const replacements = new Map<string, string>();
    for (const path of new Set([...Object.keys(this.previous), ...current.keys()])) {
      const target = current.get(path) ?? path;
      const recorded = this.previous[path];
      for (const stale of await getStaleStylesheetPaths(this.outDir, path, recorded, target)) {
        replacements.set(stale, target);
      }
      // Linked under its own path while the static directory had no file for it
      if (recorded === path && target !== path) {
        replacements.set(path, target);
      }
    }
    const relinked = await relinkStylesheets(cachedPages, replacements, this.siteUrl);
    if (relinked > 0) {
      this.logger.info(
        `Updated the stylesheet links of ${relinked} cached page${relinked === 1 ? '' : 's'}`,
      );
    }

    for (const [path, name] of current) {
      if (path !== this.plan?.path && name !== path) {
        this.logger.info(`Linked ${path} as ${name}`);
      }
    }
    if (current.size > 0) {
      manifest.stylesheets = Object.fromEntries(current);
    } else {
      delete manifest.stylesheets;
    }
  }
}
