import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readdir, rm, writeFile, access, lstat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pruneOrphanedPages } from '../../../src/core/isg/prune.js';
import { remove } from '../../../src/core/utils/index.js';
import type * as Utils from '../../../src/core/utils/index.js';
import type { CacheEntry, CacheManifest } from '../../../src/types/index.js';

// The real remove, which a test can make fail once
vi.mock('../../../src/core/utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof Utils>();
  return { ...actual, remove: vi.fn(actual.remove) };
});

const entry = (path: string): CacheEntry => ({
  path,
  inputsHash: 'hash',
  deps: [],
  tags: [],
  renderedAt: '2026-01-01T00:00:00.000Z',
  ttlSeconds: 60,
});

describe('pruneOrphanedPages', () => {
  let root: string;
  let outDir: string;

  const exists = async (path: string) =>
    access(join(outDir, path)).then(
      () => true,
      () => false,
    );
  const writeOutput = async (path: string) => {
    await mkdir(join(outDir, path, '..'), { recursive: true });
    await writeFile(join(outDir, path), 'html');
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'stati-prune-'));
    outDir = join(root, 'dist');
    await mkdir(outDir);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('deletes orphaned pages, their entries and the folders they leave empty', async () => {
    await writeOutput('index.html');
    await writeOutput('blog/a/post.html');
    await writeOutput('blog/keep.html');
    const manifest: CacheManifest = {
      entries: {
        '/index.html': entry('/index.html'),
        '/blog/a/post.html': entry('/blog/a/post.html'),
        '/blog/keep.html': entry('/blog/keep.html'),
      },
    };

    const result = await pruneOrphanedPages(
      manifest,
      new Set(['/index.html', '/blog/keep.html']),
      outDir,
    );

    expect(result).toEqual({ removed: ['/blog/a/post.html'], failed: [] });
    expect(Object.keys(manifest.entries)).toEqual(['/index.html', '/blog/keep.html']);
    expect(await exists('blog/a')).toBe(false);
    expect(await exists('blog/keep.html')).toBe(true);
  });

  it('drops an entry whose file is already gone', async () => {
    const manifest: CacheManifest = { entries: { '/gone.html': entry('/gone.html') } };

    const result = await pruneOrphanedPages(manifest, new Set(), outDir);

    expect(result.removed).toEqual([]);
    expect(manifest.entries).toEqual({});
  });

  it('only deletes HTML files inside the output directory', async () => {
    await writeFile(join(root, 'outside.html'), 'keep');
    await writeOutput('data.json');
    await mkdir(join(outDir, 'folder.html'));
    await writeFile(join(outDir, 'folder.html', 'inner.txt'), 'keep');
    const manifest: CacheManifest = {
      entries: {
        '/../outside.html': entry('/../outside.html'),
        '/data.json': entry('/data.json'),
        '/folder.html': entry('/folder.html'),
      },
    };

    const result = await pruneOrphanedPages(manifest, new Set(), outDir);

    expect(result.removed).toEqual([]);
    expect(manifest.entries).toEqual({});
    expect(await access(join(root, 'outside.html')).then(() => true)).toBe(true);
    expect(await exists('data.json')).toBe(true);
    expect(await readdir(join(outDir, 'folder.html'))).toEqual(['inner.txt']);
  });

  it('keeps the entry of a page it cannot delete, so the next build deletes it', async () => {
    await writeOutput('blog/post.html');
    const manifest: CacheManifest = {
      entries: { '/blog/post.html': entry('/blog/post.html') },
    };
    vi.mocked(remove).mockRejectedValueOnce(new Error('EBUSY: resource busy or locked'));

    const failed = await pruneOrphanedPages(manifest, new Set(), outDir);

    expect(failed).toEqual({
      removed: [],
      failed: [{ key: '/blog/post.html', message: 'EBUSY: resource busy or locked' }],
    });
    expect(Object.keys(manifest.entries)).toEqual(['/blog/post.html']);
    expect(await exists('blog/post.html')).toBe(true);

    const retried = await pruneOrphanedPages(manifest, new Set(), outDir);

    expect(retried).toEqual({ removed: ['/blog/post.html'], failed: [] });
    expect(manifest.entries).toEqual({});
    expect(await exists('blog')).toBe(false);
  });

  // Junctions on Windows, which need no extra rights; symbolic links elsewhere
  const linkFolder = (target: string, path: string) => symlink(target, path, 'junction');

  it('leaves pages in a folder linked to somewhere outside the output directory', async () => {
    const outside = join(root, 'shared');
    await mkdir(outside);
    await writeFile(join(outside, 'post.html'), 'not ours');
    await linkFolder(outside, join(outDir, 'blog'));
    const manifest: CacheManifest = {
      entries: { '/blog/post.html': entry('/blog/post.html') },
    };

    const result = await pruneOrphanedPages(manifest, new Set(), outDir);

    expect(result).toEqual({ removed: [], failed: [] });
    expect(manifest.entries).toEqual({});
    expect(await readdir(outside)).toEqual(['post.html']);
  });

  it('deletes a page through a folder linked inside the output directory, but keeps the link', async () => {
    await writeOutput('real/post.html');
    await linkFolder(join(outDir, 'real'), join(outDir, 'alias'));
    const manifest: CacheManifest = {
      entries: { '/alias/post.html': entry('/alias/post.html') },
    };

    const result = await pruneOrphanedPages(manifest, new Set(), outDir);

    expect(result).toEqual({ removed: ['/alias/post.html'], failed: [] });
    expect(await readdir(join(outDir, 'real'))).toEqual([]);
    expect((await lstat(join(outDir, 'alias'))).isSymbolicLink()).toBe(true);
  });
});
