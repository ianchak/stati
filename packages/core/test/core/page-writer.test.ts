/**
 * Tests for the page writers: written as pages render, held for the stylesheet, or written
 * together in development, each with the page's cache entry.
 * @module core/page-writer.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createPageWriter,
  recordCacheEntry,
  type PageWriterContext,
  type RenderedPage,
} from '../../src/core/page-writer.js';
import type { StylesheetRuntime } from '../../src/css/runtime.js';
import type { CacheEntry, PageModel, StatiConfig } from '../../src/types/index.js';

const config: StatiConfig = { site: { title: 'Test', baseUrl: 'https://example.com' } };
const buildTime = new Date('2026-10-30T10:00:00.000Z');

function page(url: string, frontMatter: PageModel['frontMatter'] = {}): PageModel {
  return { slug: url, url, sourcePath: `/site${url}.md`, frontMatter, content: `# ${url}` };
}

describe('page writers', () => {
  let dir: string;
  let hold: ReturnType<typeof vi.fn>;

  function context(overrides: Partial<PageWriterContext> = {}): PageWriterContext {
    return {
      config,
      manifest: { entries: {} },
      buildTime,
      skipCacheUpdate: false,
      stylesheets: { holdsPages: false, hold } as unknown as StylesheetRuntime,
      ...overrides,
    };
  }

  function rendered(url: string, existingEntry?: CacheEntry): RenderedPage {
    return {
      page: page(url),
      outputPath: join(dir, 'dist', url === '/' ? 'index.html' : `${url}.html`),
      cacheKey: url === '/' ? '/index.html' : `${url}.html`,
      html: `<h1>${url}</h1>`,
      existingEntry,
      renderInputsHash: 'inputs',
      renderedAssets: { assetDeps: [], images: [], templates: [], templateLookups: [] },
    };
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'stati-page-writer-'));
    hold = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('recordCacheEntry', () => {
    it('creates an entry for a page rendered for the first time', async () => {
      const ctx = context();

      await recordCacheEntry(ctx, rendered('/about'));

      expect(ctx.manifest.entries['/about.html']).toMatchObject({
        renderedAt: buildTime.toISOString(),
        templatesRecorded: true,
      });
    });

    it("keeps an earlier entry's publish date when the page no longer sets one", async () => {
      const ctx = context();
      const existing = {
        path: '/about.html',
        inputsHash: 'old',
        deps: [],
        tags: [],
        renderedAt: '2026-01-01T00:00:00.000Z',
        ttlSeconds: 3600,
        publishedAt: '2026-01-01T00:00:00.000Z',
      } satisfies CacheEntry;

      await recordCacheEntry(ctx, rendered('/about', existing));

      expect(ctx.manifest.entries['/about.html']).toMatchObject({
        publishedAt: '2026-01-01T00:00:00.000Z',
        renderedAt: buildTime.toISOString(),
      });
    });
  });

  describe('production', () => {
    it('writes each page as it renders and records its cache entry', async () => {
      const ctx = context();
      const writer = createPageWriter(ctx, false);
      const page = rendered('/docs/intro');

      await writer.write(page);

      expect(await readFile(page.outputPath, 'utf-8')).toBe('<h1>/docs/intro</h1>');
      expect(Object.keys(ctx.manifest.entries)).toEqual(['/docs/intro.html']);
      expect(writer.fileWriteMs).toBeGreaterThan(0);
      expect(writer.cacheEntryMs).toBeGreaterThan(0);
      await writer.flush();
      expect(hold).not.toHaveBeenCalled();
    });

    it('leaves the cache entries alone with skipCacheUpdate', async () => {
      const ctx = context({ skipCacheUpdate: true });
      const writer = createPageWriter(ctx, false);

      await writer.write(rendered('/'));

      expect(existsSync(join(dir, 'dist', 'index.html'))).toBe(true);
      expect(ctx.manifest.entries).toEqual({});
      expect(writer.cacheEntryMs).toBe(0);
    });

    it('holds each page for the stylesheet and records its cache entry now', async () => {
      const ctx = context({
        stylesheets: { holdsPages: true, hold } as unknown as StylesheetRuntime,
      });
      const writer = createPageWriter(ctx, false);
      const page = rendered('/');

      await writer.write(page);

      expect(hold).toHaveBeenCalledWith(page.outputPath, page.html);
      expect(existsSync(page.outputPath)).toBe(false);
      expect(Object.keys(ctx.manifest.entries)).toEqual(['/index.html']);
    });
  });

  describe('development', () => {
    it('writes every page once the last one has rendered, then records the entries in order', async () => {
      const ctx = context();
      const writer = createPageWriter(ctx, true);
      const first = rendered('/');
      const second = rendered('/blog/post');

      await writer.write(first);
      await writer.write(second);
      expect(existsSync(first.outputPath)).toBe(false);
      expect(ctx.manifest.entries).toEqual({});

      await writer.flush();

      expect(await readFile(first.outputPath, 'utf-8')).toBe('<h1>/</h1>');
      expect(await readFile(second.outputPath, 'utf-8')).toBe('<h1>/blog/post</h1>');
      expect(Object.keys(ctx.manifest.entries)).toEqual(['/index.html', '/blog/post.html']);
      expect(writer.fileWriteMs).toBeGreaterThan(0);
      expect(writer.cacheEntryMs).toBeGreaterThan(0);
    });

    it('writes nothing when no page rendered', async () => {
      const writer = createPageWriter(context(), true);

      await writer.flush();

      expect(existsSync(join(dir, 'dist'))).toBe(false);
      expect(writer.fileWriteMs).toBe(0);
    });

    it('leaves the cache entries alone with skipCacheUpdate', async () => {
      const ctx = context({ skipCacheUpdate: true });
      const writer = createPageWriter(ctx, true);

      await writer.write(rendered('/'));
      await writer.flush();

      expect(existsSync(join(dir, 'dist', 'index.html'))).toBe(true);
      expect(ctx.manifest.entries).toEqual({});
      expect(writer.cacheEntryMs).toBe(0);
    });
  });
});
