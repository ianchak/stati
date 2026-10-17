/**
 * Tests for deleting search index files earlier builds left behind.
 * @module search/stale-indexes.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeStaleSearchIndexes } from '../../src/search/generator.js';

describe('removeStaleSearchIndexes', () => {
  let outDir: string;

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'stati-search-indexes-'));
  });

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  async function files(...names: string[]): Promise<void> {
    await Promise.all(names.map((name) => writeFile(join(outDir, name), '{}')));
  }

  it('deletes older hashed and unhashed indexes but keeps the current one', async () => {
    await files(
      'search-index-0a1b2c3d.json',
      'search-index-deadbeef.json',
      'search-index.json',
      'search-index-e77989ed.json',
    );

    const removed = await removeStaleSearchIndexes(
      outDir,
      { enabled: true },
      'search-index-e77989ed.json',
    );

    expect(removed.sort()).toEqual([
      'search-index-0a1b2c3d.json',
      'search-index-deadbeef.json',
      'search-index.json',
    ]);
    expect(await readdir(outDir)).toEqual(['search-index-e77989ed.json']);
  });

  it('only touches files named after the configured indexName', async () => {
    await files(
      'docs-index-0a1b2c3d.json',
      'docs-index.json',
      'search-index-0a1b2c3d.json',
      'search-index-notes.json',
      'data.json',
    );

    await removeStaleSearchIndexes(
      outDir,
      { enabled: true, indexName: 'docs-index' },
      'docs-index.json',
    );

    expect((await readdir(outDir)).sort()).toEqual([
      'data.json',
      'docs-index.json',
      'search-index-0a1b2c3d.json',
      'search-index-notes.json',
    ]);
  });

  it('escapes regular expression characters in indexName', async () => {
    await files('a.b-0a1b2c3d.json', 'axb-0a1b2c3d.json', 'a.b.json');

    await removeStaleSearchIndexes(outDir, { enabled: true, indexName: 'a.b' }, 'a.b.json');

    expect((await readdir(outDir)).sort()).toEqual(['a.b.json', 'axb-0a1b2c3d.json']);
  });

  it('returns nothing when the output directory does not exist', async () => {
    expect(
      await removeStaleSearchIndexes(
        join(outDir, 'missing'),
        { enabled: true },
        'search-index.json',
      ),
    ).toEqual([]);
  });
});
