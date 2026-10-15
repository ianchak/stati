import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  clearSourceCache,
  getSourceCacheEntries,
  inspectSource,
  inspectSourceSync,
  seedSourceCache,
} from '../../src/images/sources.js';
import { pngBytes } from './fixtures.js';

describe('source image cache', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'stati-image-sources-'));
    file = join(dir, 'photo.png');
    await writeFile(file, pngBytes(800, 600));
    clearSourceCache();
  });

  afterEach(async () => {
    clearSourceCache();
    await rm(dir, { recursive: true, force: true });
  });

  it('trusts entries from a previous build while size and modification time match', async () => {
    const stats = await stat(file);
    const seeded = { size: stats.size, mtimeMs: stats.mtimeMs, hash: 'manifest', probe: null };
    seedSourceCache({ [file]: seeded });

    expect(inspectSourceSync(file)).toEqual(seeded);
    expect(await inspectSource(file)).toEqual(seeded);

    const later = new Date(stats.mtimeMs + 60_000);
    await utimes(file, later, later);
    expect(await inspectSource(file)).toMatchObject({
      hash: expect.not.stringMatching('manifest'),
      probe: { format: 'png', width: 800, height: 600 },
    });
  });

  it('keeps what this build already read when seeding', async () => {
    const read = await inspectSource(file);
    seedSourceCache({ [file]: { size: 0, mtimeMs: 0, hash: 'stale', probe: null } });
    expect(getSourceCacheEntries([file])).toEqual({ [file.replace(/\\/g, '/')]: read });
  });
});
