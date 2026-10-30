import { describe, it, expect } from 'vitest';
import type { CacheEntry, PageModel, StatiConfig } from '../../../src/types/index.js';
import { parseCacheEntry } from '../../../src/core/isg/entry.js';
import { createCacheEntry } from '../../../src/core/isg/builder.js';
import { createStaleEntry, markStale } from '../../../src/core/isg/stale.js';

describe('parseCacheEntry', () => {
  /** An entry as a render records it, with every optional field */
  const fullEntry = (): CacheEntry => ({
    path: '/blog/post.html',
    inputsHash: 'sha256-abc',
    deps: ['/project/site/layout.eta', '/project/site/partials/header.eta'],
    templateLookups: [
      { name: 'layout', from: 'blog', file: 'layout.eta' },
      { name: '/partials/promo', file: null },
    ],
    templatesRecorded: true,
    tags: ['blog'],
    publishedAt: '2024-01-15T00:00:00.000Z',
    renderedAt: '2024-03-15T10:00:00.000Z',
    ttlSeconds: 3600,
    maxAgeCapDays: 365,
    assetDeps: ['/project/site/blog/map.png'],
    images: ['_img/map-0123abcd.webp'],
    readsCollection: true,
    readsNav: false,
  });

  const reasonFor = (overrides: Record<string, unknown>) => {
    const parsed = parseCacheEntry({ ...fullEntry(), ...overrides });
    return 'reason' in parsed ? parsed.reason : undefined;
  };

  it('returns an entry with every field valid as it is', () => {
    const entry = fullEntry();

    expect(parseCacheEntry(entry)).toBe(entry);
  });

  it('accepts an entry with the optional fields left out', () => {
    const {
      templateLookups: _lookups,
      templatesRecorded: _recorded,
      publishedAt: _publishedAt,
      maxAgeCapDays: _maxAge,
      assetDeps: _assetDeps,
      images: _images,
      readsCollection: _readsCollection,
      readsNav: _readsNav,
      ...minimal
    } = fullEntry();

    expect(parseCacheEntry(minimal)).toEqual(minimal);
  });

  it('accepts optional fields set to undefined', () => {
    expect(reasonFor({ publishedAt: undefined, maxAgeCapDays: undefined })).toBeUndefined();
  });

  it('keeps fields the entry type does not know', () => {
    expect(parseCacheEntry({ ...fullEntry(), note: 'from a newer release' })).toMatchObject({
      note: 'from a newer release',
    });
  });

  it('accepts a ttlSeconds of 0 and the entries that stale and reset pages get', () => {
    expect(reasonFor({ ttlSeconds: 0 })).toBeUndefined();
    expect(parseCacheEntry(createStaleEntry('/a.html'))).not.toHaveProperty('reason');
    expect(parseCacheEntry(markStale(fullEntry()))).not.toHaveProperty('reason');
  });

  it('accepts every entry a render writes', async () => {
    const page: PageModel = {
      slug: 'post',
      sourcePath: 'site/blog/post.md',
      url: '/blog/post',
      content: '<p>Post</p>',
      frontMatter: { title: 'Post', tags: ['blog'], date: '2024-01-15', maxAgeCapDays: 30 },
    };
    const config: StatiConfig = { site: { title: 'Site', baseUrl: 'https://example.com' } };

    const entry = await createCacheEntry(page, config, new Date('2024-03-15T10:00:00Z'), 'r', {
      assetDeps: ['/project/site/blog/map.png'],
      images: ['_img/map-0123abcd.webp'],
      reads: { collection: true, nav: false },
      templates: ['/project/site/layout.eta'],
      templateLookups: [{ name: 'layout', from: 'blog', file: null }],
    });

    expect(entry).toMatchObject({ publishedAt: expect.any(String), maxAgeCapDays: 30 });
    expect(parseCacheEntry(entry)).toBe(entry);
    expect(parseCacheEntry(JSON.parse(JSON.stringify(entry)))).toEqual(entry);
  });

  it.each([null, undefined, 'not an object', 42, true])('rejects %j: not an object', (raw) => {
    expect(parseCacheEntry(raw)).toEqual({ reason: 'not an object' });
  });

  it.each(['path', 'inputsHash', 'deps', 'tags', 'renderedAt', 'ttlSeconds'])(
    'rejects an entry without %s',
    (field) => {
      const entry: Record<string, unknown> = { ...fullEntry() };
      delete entry[field];

      expect(parseCacheEntry(entry)).toEqual({ reason: `missing required field "${field}"` });
    },
  );

  it('rejects an array, which has none of the required fields', () => {
    expect(parseCacheEntry([])).toEqual({ reason: 'missing required field "path"' });
  });

  it.each([
    ['path is undefined', { path: undefined }, '"path" must be a string'],
    ['path is a number', { path: 42 }, '"path" must be a string'],
    ['inputsHash is undefined', { inputsHash: undefined }, '"inputsHash" must be a string'],
    ['deps is not an array', { deps: 'layout.eta' }, '"deps" must be an array of strings'],
    [
      'deps contains non-strings',
      { deps: ['/site/layout.eta', 123, null] },
      '"deps" must be an array of strings',
    ],
    ['tags is not an array', { tags: 'page' }, '"tags" must be an array of strings'],
    ['tags contains non-strings', { tags: ['valid', 42] }, '"tags" must be an array of strings'],
    [
      'renderedAt is undefined',
      { renderedAt: undefined },
      '"renderedAt" must be a valid date string',
    ],
    ['renderedAt is empty', { renderedAt: '' }, '"renderedAt" must be a valid date string'],
    [
      'renderedAt is not a date',
      { renderedAt: 'yesterday' },
      '"renderedAt" must be a valid date string',
    ],
    [
      'renderedAt is a number',
      { renderedAt: 1710496800000 },
      '"renderedAt" must be a valid date string',
    ],
    [
      'ttlSeconds is not a number',
      { ttlSeconds: 'soon' },
      '"ttlSeconds" must be a finite number of 0 or more',
    ],
    ['ttlSeconds is NaN', { ttlSeconds: NaN }, '"ttlSeconds" must be a finite number of 0 or more'],
    [
      'ttlSeconds is Infinity',
      { ttlSeconds: Infinity },
      '"ttlSeconds" must be a finite number of 0 or more',
    ],
    [
      'ttlSeconds is negative',
      { ttlSeconds: -1 },
      '"ttlSeconds" must be a finite number of 0 or more',
    ],
    [
      'publishedAt is not a string',
      { publishedAt: 12345 },
      '"publishedAt" must be a valid date string',
    ],
    ['publishedAt is null', { publishedAt: null }, '"publishedAt" must be a valid date string'],
    ['publishedAt is empty', { publishedAt: '' }, '"publishedAt" must be a valid date string'],
    [
      'publishedAt is not a date',
      { publishedAt: 'someday' },
      '"publishedAt" must be a valid date string',
    ],
    [
      'maxAgeCapDays is not a number',
      { maxAgeCapDays: 'forever' },
      '"maxAgeCapDays" must be a finite number above 0',
    ],
    ['maxAgeCapDays is 0', { maxAgeCapDays: 0 }, '"maxAgeCapDays" must be a finite number above 0'],
    [
      'maxAgeCapDays is negative',
      { maxAgeCapDays: -30 },
      '"maxAgeCapDays" must be a finite number above 0',
    ],
    [
      'maxAgeCapDays is Infinity',
      { maxAgeCapDays: Infinity },
      '"maxAgeCapDays" must be a finite number above 0',
    ],
    [
      'assetDeps is not a list',
      { assetDeps: 'site/photo.png' },
      '"assetDeps" must be an array of strings',
    ],
    [
      'assetDeps is not a list of strings',
      { assetDeps: [42] },
      '"assetDeps" must be an array of strings',
    ],
    ['images is not a list of strings', { images: [42] }, '"images" must be an array of strings'],
    [
      'readsCollection is not a boolean',
      { readsCollection: 'yes' },
      '"readsCollection" must be a boolean',
    ],
    ['readsNav is not a boolean', { readsNav: 1 }, '"readsNav" must be a boolean'],
    [
      'templatesRecorded is not a boolean',
      { templatesRecorded: 'yes' },
      '"templatesRecorded" must be a boolean',
    ],
    [
      'templateLookups is not a list',
      { templateLookups: 'partials/header' },
      '"templateLookups" must be a list of { name, from?, file } objects',
    ],
    [
      'a lookup has no name',
      { templateLookups: [{ from: '', file: null }] },
      '"templateLookups" must be a list of { name, from?, file } objects',
    ],
    [
      'a lookup file is not a string',
      { templateLookups: [{ name: 'x', file: 1 }] },
      '"templateLookups" must be a list of { name, from?, file } objects',
    ],
  ])('rejects an entry when %s', (_, overrides, reason) => {
    expect(reasonFor(overrides)).toBe(reason);
  });
});
