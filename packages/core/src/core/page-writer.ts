/**
 * Where a build's rendered pages go, and the cache entry each gets: written as they render,
 * held until the stylesheet is built, or written together in development.
 * @module core/page-writer
 */

import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { ensureDir, writeFile } from './utils/index.js';
import { createCacheEntry, updateCacheEntry, type RenderedAssets } from './isg/index.js';
import type { CacheEntry, CacheManifest, Logger, PageModel, StatiConfig } from '../types/index.js';
import type { StylesheetRuntime } from '../css/runtime.js';

/** A rendered page, the file it goes to and what its cache entry records */
export interface RenderedPage {
  page: PageModel;
  /** The page's output file, absolute */
  outputPath: string;
  /** The page's key in the cache manifest */
  cacheKey: string;
  html: string;
  /** The page's entry from the last build, if any */
  existingEntry: CacheEntry | undefined;
  /** The render-inputs hash for what the render read */
  renderInputsHash: string;
  renderedAssets: RenderedAssets;
}

/** The build-wide values a {@link PageWriter} reads */
export interface PageWriterContext {
  config: StatiConfig;
  manifest: CacheManifest;
  buildTime: Date;
  /** Leave the cache entries of rendered pages alone (`BuildOptions.skipCacheUpdate`) */
  skipCacheUpdate: boolean;
  stylesheets: StylesheetRuntime;
  /** Reports templates a cache entry can't hash */
  logger: Logger;
}

/**
 * Writes the cache entry of a rendered page: its last entry updated, or a new one.
 *
 * @param context - The build's manifest, config, build time and logger
 * @param rendered - The page and what its render recorded
 */
export async function recordCacheEntry(
  context: Pick<PageWriterContext, 'config' | 'manifest' | 'buildTime' | 'logger'>,
  rendered: RenderedPage,
): Promise<void> {
  const { config, manifest, buildTime, logger } = context;
  const { page, cacheKey, existingEntry, renderInputsHash, renderedAssets } = rendered;
  manifest.entries[cacheKey] = existingEntry
    ? await updateCacheEntry(
        existingEntry,
        page,
        config,
        buildTime,
        renderInputsHash,
        renderedAssets,
        logger,
      )
    : await createCacheEntry(page, config, buildTime, renderInputsHash, renderedAssets, logger);
}

/** Writes rendered pages and records their cache entries */
export interface PageWriter {
  /** Takes a page as it renders, before its `afterRender` hook */
  write(rendered: RenderedPage): Promise<void>;
  /** Writes what {@link write} kept, once the last page has rendered */
  flush(): Promise<void>;
  /** Milliseconds spent writing pages, for the `fileWriteTotalMs` phase */
  readonly fileWriteMs: number;
  /** Milliseconds spent recording cache entries, for the `cacheEntryTotalMs` phase */
  readonly cacheEntryMs: number;
}

/**
 * Production without Tailwind: writes each page as it renders and records its cache entry.
 */
class ImmediatePageWriter implements PageWriter {
  fileWriteMs = 0;
  cacheEntryMs = 0;

  constructor(protected readonly context: PageWriterContext) {}

  async write(rendered: RenderedPage): Promise<void> {
    const fileWriteStart = performance.now();
    await this.writePage(rendered);
    this.fileWriteMs += performance.now() - fileWriteStart;

    if (!this.context.skipCacheUpdate) {
      const cacheEntryStart = performance.now();
      await recordCacheEntry(this.context, rendered);
      this.cacheEntryMs += performance.now() - cacheEntryStart;
    }
  }

  async flush(): Promise<void> {}

  protected async writePage({ outputPath, html }: RenderedPage): Promise<void> {
    await ensureDir(dirname(outputPath));
    await writeFile(outputPath, html, 'utf-8');
  }
}

/**
 * Production with Tailwind: holds each page in the stylesheet runtime, which writes it with the
 * stylesheet's final name once Tailwind has run, and records its cache entry now.
 */
class DeferredPageWriter extends ImmediatePageWriter {
  protected override async writePage({ outputPath, html }: RenderedPage): Promise<void> {
    await this.context.stylesheets.hold(outputPath, html);
  }
}

/**
 * Development: writes every page in parallel once the last one has rendered, which avoids
 * Windows file system slowdowns, then records the cache entries in render order.
 */
class BatchedPageWriter implements PageWriter {
  fileWriteMs = 0;
  cacheEntryMs = 0;
  private readonly pending: RenderedPage[] = [];

  constructor(private readonly context: PageWriterContext) {}

  async write(rendered: RenderedPage): Promise<void> {
    this.pending.push(rendered);
  }

  async flush(): Promise<void> {
    if (this.pending.length === 0) {
      return;
    }
    const fileWriteStart = performance.now();
    const dirs = [...new Set(this.pending.map(({ outputPath }) => dirname(outputPath)))];
    await Promise.all(dirs.map((dir) => ensureDir(dir)));
    await Promise.all(
      this.pending.map(({ outputPath, html }) => writeFile(outputPath, html, 'utf-8')),
    );
    this.fileWriteMs = performance.now() - fileWriteStart;

    // From the templates each render recorded
    if (!this.context.skipCacheUpdate) {
      const cacheEntryStart = performance.now();
      for (const rendered of this.pending) {
        await recordCacheEntry(this.context, rendered);
      }
      this.cacheEntryMs = performance.now() - cacheEntryStart;
    }
  }
}

/**
 * The writer for a build: batched in development, held for the stylesheet in a production
 * build with Tailwind, written as they render otherwise.
 *
 * @param context - The build's manifest, config, build time and stylesheet runtime
 * @param development - Whether this is a development build
 */
export function createPageWriter(context: PageWriterContext, development: boolean): PageWriter {
  if (development) {
    return new BatchedPageWriter(context);
  }
  return context.stylesheets.holdsPages
    ? new DeferredPageWriter(context)
    : new ImmediatePageWriter(context);
}
