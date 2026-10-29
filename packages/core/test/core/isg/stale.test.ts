import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STALE_INPUTS_HASH } from '../../../src/constants.js';
import { loadCacheManifest, saveCacheManifest } from '../../../src/core/isg/manifest.js';
import { createStaleEntry, markStale } from '../../../src/core/isg/stale.js';
import type { CacheEntry } from '../../../src/types/index.js';

const entry: CacheEntry = {
  path: '/about.html',
  inputsHash: 'abc123',
  deps: ['/project/site/layout.eta'],
  tags: ['info'],
  renderedAt: '2024-03-15T10:00:00.000Z',
  ttlSeconds: 3600,
  templatesRecorded: true,
  images: ['_img/photo-0123abcd.png'],
};

describe('stale cache entries', () => {
  it('uses a marker that no inputs hash can equal', () => {
    expect(STALE_INPUTS_HASH).toBe('STALE');
  });

  describe('markStale', () => {
    it('sets the stale marker and keeps every other field', () => {
      expect(markStale(entry)).toEqual({ ...entry, inputsHash: 'STALE' });
    });

    it('returns a copy and leaves the entry alone', () => {
      markStale(entry);

      expect(entry.inputsHash).toBe('abc123');
    });
  });

  describe('createStaleEntry', () => {
    it('records only the output path, under the stale marker', () => {
      expect(createStaleEntry('/blog/post.html')).toEqual({
        path: '/blog/post.html',
        inputsHash: 'STALE',
        deps: [],
        tags: [],
        renderedAt: '1970-01-01T00:00:00.000Z',
        ttlSeconds: 0,
      });
    });

    it('is a valid entry, so the next load keeps it unchanged and without a warning', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'stati-stale-'));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const stale = createStaleEntry('/blog/post.html');
        await saveCacheManifest(dir, { entries: { '/blog/post.html': stale } });

        const loaded = await loadCacheManifest(dir);

        expect(loaded?.entries['/blog/post.html']).toEqual(stale);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
        await rm(dir, { recursive: true, force: true });
      }
    });
  });
});
