import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import type { PageModel, CacheEntry, StatiConfig } from '../../../src/types/index.js';
import { TemplateIndex } from '../../../src/core/template-index.js';

// Mock all ISG modules that the builder depends on - use factory functions
vi.mock('../../../src/core/isg/hash.js', () => ({
  computeContentHash: vi.fn(),
  computeFileHash: vi.fn(),
  computeBinaryFileHash: vi.fn(),
  computeInputsHash: vi.fn(),
}));

vi.mock('../../../src/core/isg/deps.js', () => ({
  resolveLayoutDependency: vi.fn(),
}));

vi.mock('../../../src/core/isg/ttl.js', () => ({
  computeEffectiveTTL: vi.fn(),
  computeNextRebuildAt: vi.fn(),
  isPageFrozen: vi.fn(),
}));

import {
  shouldRebuildPage,
  createCacheEntry,
  updateCacheEntry,
  hasRecordedReads,
  hasRecordedTemplates,
  type RenderedAssets,
} from '../../../src/core/isg/builder.js';

// Get references to the mocked functions
import {
  computeContentHash,
  computeFileHash,
  computeInputsHash,
} from '../../../src/core/isg/hash.js';
import { resolveLayoutDependency } from '../../../src/core/isg/deps.js';
import {
  computeEffectiveTTL,
  computeNextRebuildAt,
  isPageFrozen,
} from '../../../src/core/isg/ttl.js';

const mockComputeContentHash = vi.mocked(computeContentHash);
const mockComputeFileHash = vi.mocked(computeFileHash);
const mockComputeInputsHash = vi.mocked(computeInputsHash);
const mockResolveLayoutDependency = vi.mocked(resolveLayoutDependency);
const mockComputeEffectiveTTL = vi.mocked(computeEffectiveTTL);
const mockComputeNextRebuildAt = vi.mocked(computeNextRebuildAt);
const mockIsPageFrozen = vi.mocked(isPageFrozen);

describe('ISG Build Integration', () => {
  const srcDir = join('/test', 'site');
  const testLayoutPath = '/test/site/layout.eta';
  const testHeaderPath = '/test/site/partials/header.eta';
  const testFooterPath = '/test/site/partials/footer.eta';

  const mockConfig: StatiConfig = {
    srcDir: 'site',
    outDir: 'dist',
    site: {
      title: 'Test Site',
      baseUrl: 'https://test.com',
    },
    isg: {
      enabled: true,
      ttlSeconds: 3600,
      aging: [],
    },
  };

  const mockPage: PageModel = {
    slug: 'test-page',
    sourcePath: join(srcDir, 'test.md'),
    url: '/test',
    content: '<h1>Test Content</h1>',
    frontMatter: {
      title: 'Test Page',
      tags: ['page'],
      publishedAt: '2024-01-01T00:00:00.000Z',
    },
    publishedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const allPages = [mockPage];
  const fixedDate = new Date('2024-03-15T10:00:00Z');

  /** The templates a site has: the layout and two partials */
  let index: TemplateIndex;

  /** An entry as a 2.0 render records it */
  const recordedEntry = (overrides: Partial<CacheEntry> = {}): CacheEntry => ({
    path: '/test.html',
    inputsHash: 'inputs123',
    deps: [testLayoutPath, testHeaderPath],
    templateLookups: [
      { name: 'layout', from: '', file: 'layout.eta' },
      { name: 'partials/header', from: '', file: 'partials/header.eta' },
      { name: 'partials/promo', from: '', file: null },
    ],
    templatesRecorded: true,
    tags: ['page'],
    renderedAt: new Date(fixedDate.getTime() - 1800000).toISOString(), // 30 minutes ago
    ttlSeconds: 3600,
    ...overrides,
  });

  const rendered = (overrides: Partial<RenderedAssets> = {}): RenderedAssets => ({
    assetDeps: [],
    images: [],
    templates: [testLayoutPath, testHeaderPath],
    templateLookups: [{ name: 'partials/header', from: '', file: 'partials/header.eta' }],
    ...overrides,
  });

  const check = (entry: CacheEntry | undefined, now = fixedDate) =>
    shouldRebuildPage(mockPage, entry, mockConfig, allPages, now, undefined, index);

  beforeEach(() => {
    vi.clearAllMocks();
    index = new TemplateIndex(srcDir, ['layout.eta', 'partials/header.eta', 'partials/footer.eta']);

    mockComputeContentHash.mockReturnValue('content123');
    mockComputeFileHash.mockResolvedValue('file123');
    mockComputeInputsHash.mockReturnValue('inputs123');
    mockResolveLayoutDependency.mockReturnValue(testLayoutPath);
    mockComputeEffectiveTTL.mockReturnValue(3600);
    mockComputeNextRebuildAt.mockReturnValue(new Date(fixedDate.getTime() + 3600000));
    mockIsPageFrozen.mockReturnValue(false);
  });

  describe('shouldRebuildPage', () => {
    it('should rebuild when no cache entry exists', async () => {
      expect(await check(undefined)).toBe(true);
    });

    it('should rebuild every page when ISG is disabled', async () => {
      const result = await shouldRebuildPage(
        mockPage,
        recordedEntry(),
        { ...mockConfig, isg: { enabled: false } },
        allPages,
        fixedDate,
        undefined,
        index,
      );
      expect(result).toBe(true);
    });

    it('should not rebuild when within TTL and inputs unchanged', async () => {
      expect(await check(recordedEntry())).toBe(false);
    });

    it('should hash the templates the render recorded, without reading others', async () => {
      await check(recordedEntry());

      expect(mockComputeFileHash.mock.calls.map(([dep]) => dep)).toEqual([
        testLayoutPath,
        testHeaderPath,
      ]);
      expect(mockComputeInputsHash).toHaveBeenCalledWith(
        'content123',
        ['file123', 'file123'],
        undefined,
      );
    });

    it('should rebuild when content hash changes', async () => {
      mockComputeContentHash.mockReturnValue('new_content123');
      mockComputeInputsHash.mockReturnValue('new_inputs123');

      expect(await check(recordedEntry())).toBe(true);
      expect(mockComputeContentHash).toHaveBeenCalledWith(mockPage.content, mockPage.frontMatter);
    });

    it('should rebuild when a recorded template changes', async () => {
      mockComputeFileHash.mockResolvedValueOnce('file123').mockResolvedValueOnce('changed');
      mockComputeInputsHash.mockReturnValue('new_inputs123');

      expect(await check(recordedEntry())).toBe(true);
    });

    it('should rebuild when a recorded template no longer exists', async () => {
      mockComputeFileHash.mockResolvedValueOnce('file123').mockResolvedValueOnce(null);

      expect(await check(recordedEntry())).toBe(true);
    });

    it('should rebuild once an entry written before templates were recorded', async () => {
      const { templatesRecorded: _, templateLookups: __, ...oldEntry } = recordedEntry();

      expect(hasRecordedTemplates(oldEntry)).toBe(false);
      expect(await check(oldEntry)).toBe(true);
      expect(mockComputeFileHash).not.toHaveBeenCalled();
    });

    it('should rebuild when the page would now use another layout', async () => {
      mockResolveLayoutDependency.mockReturnValue('/test/site/blog/index.eta');

      expect(await check(recordedEntry())).toBe(true);
      expect(mockResolveLayoutDependency).toHaveBeenCalledWith(mockPage, allPages, index);
    });

    it('should keep a page whose layout path differs only in the case of the drive letter', async () => {
      // A build from another shell can see the working directory as c:\ instead of C:\
      mockResolveLayoutDependency.mockReturnValue('C:/site/layout.eta');

      expect(await check(recordedEntry({ deps: ['c:/site/layout.eta', testHeaderPath] }))).toBe(
        false,
      );
    });

    it('should always rebuild a page that has no layout, so a new one takes effect', async () => {
      mockResolveLayoutDependency.mockReturnValue(null);

      expect(await check(recordedEntry({ deps: [] }))).toBe(true);
    });

    it('should rebuild when a section override would now take a recorded lookup', async () => {
      const entry = recordedEntry({
        templateLookups: [{ name: 'partials/header', from: 'blog', file: 'partials/header.eta' }],
      });
      expect(await check(entry)).toBe(false);

      index.add('blog/partials/header.eta');
      expect(await check(entry)).toBe(true);
    });

    it('should rebuild when a file a lookup did not find now exists', async () => {
      const entry = recordedEntry();
      expect(await check(entry)).toBe(false);

      index.add('partials/promo.eta');
      expect(await check(entry)).toBe(true);
    });

    it('should rebuild when a file a lookup found is gone', async () => {
      const entry = recordedEntry();
      index.remove('partials/header.eta');

      expect(await check(entry)).toBe(true);
    });

    it('should read the template index itself when none is passed', async () => {
      const result = await shouldRebuildPage(
        mockPage,
        recordedEntry({ templateLookups: [] }),
        { ...mockConfig, srcDir: 'definitely-missing-folder' },
        allPages,
        fixedDate,
      );
      expect(result).toBe(false);
    });

    it('should not rebuild when page is frozen', async () => {
      mockIsPageFrozen.mockReturnValue(true);
      const entry = recordedEntry({
        renderedAt: new Date(fixedDate.getTime() - 7200000).toISOString(),
      });

      expect(await check(entry)).toBe(false);
      expect(mockIsPageFrozen).toHaveBeenCalledWith(entry, fixedDate);
    });

    it('should rebuild when TTL expires and page is not frozen', async () => {
      mockComputeNextRebuildAt.mockReturnValue(new Date(fixedDate.getTime() - 1000));

      expect(await check(recordedEntry())).toBe(true);
    });

    it('should handle complete build cycle', async () => {
      expect(await check(undefined)).toBe(true);

      const entry = await createCacheEntry(mockPage, mockConfig, fixedDate, undefined, rendered());
      expect(await check(entry)).toBe(false);

      // Two hours later the TTL has expired
      const laterTime = new Date(fixedDate.getTime() + 7200000);
      mockComputeNextRebuildAt.mockReturnValue(new Date(fixedDate.getTime() + 3600000));
      expect(await check(entry, laterTime)).toBe(true);

      const updated = await updateCacheEntry(
        entry,
        mockPage,
        mockConfig,
        laterTime,
        undefined,
        rendered(),
      );
      expect(updated.renderedAt).toBe(laterTime.toISOString());
    });
  });

  describe('createCacheEntry', () => {
    it('should create an entry from what the render recorded', async () => {
      const result = await createCacheEntry(mockPage, mockConfig, fixedDate, 'r', rendered());

      expect(result).toEqual({
        path: '/test.html',
        inputsHash: 'inputs123',
        deps: [testLayoutPath, testHeaderPath],
        templateLookups: [{ name: 'partials/header', from: '', file: 'partials/header.eta' }],
        templatesRecorded: true,
        tags: ['page'],
        renderedAt: fixedDate.toISOString(),
        ttlSeconds: 3600,
        publishedAt: mockPage.publishedAt?.toISOString(),
      });
      expect(hasRecordedTemplates(result)).toBe(true);
      expect(mockComputeFileHash.mock.calls.map(([dep]) => dep)).toEqual([
        testLayoutPath,
        testHeaderPath,
      ]);
      expect(mockComputeInputsHash).toHaveBeenCalledWith('content123', ['file123', 'file123'], 'r');
      expect(mockComputeEffectiveTTL).toHaveBeenCalledWith(mockPage, mockConfig.isg);
    });

    it('should store the entry of a page that rendered with an error as stale', async () => {
      const result = await createCacheEntry(
        mockPage,
        mockConfig,
        fixedDate,
        'r',
        rendered({ failed: true }),
      );

      // The entry stays, so the output can be pruned, but never matches the page's inputs
      expect(result.inputsHash).toBe('STALE');
      expect(result.path).toBe('/test.html');
      expect(result.deps).toEqual([testLayoutPath, testHeaderPath]);
    });

    it('should not mark an entry recorded when the render reported no templates', async () => {
      const result = await createCacheEntry(mockPage, mockConfig, fixedDate);

      expect(result.deps).toEqual([]);
      expect(result).not.toHaveProperty('templatesRecorded');
      expect(result).not.toHaveProperty('templateLookups');
      expect(hasRecordedTemplates(result)).toBe(false);
    });

    it('should handle pages without publishedAt', async () => {
      const { publishedAt: _, ...pageBase } = mockPage;
      const { publishedAt: _frontMatterPublishedAt, ...frontMatterBase } = mockPage.frontMatter;
      const pageWithoutDate: PageModel = { ...pageBase, frontMatter: frontMatterBase };

      const result = await createCacheEntry(pageWithoutDate, mockConfig, fixedDate);
      expect(result.publishedAt).toBeUndefined();
    });

    it('should handle custom TTL from config', async () => {
      mockComputeEffectiveTTL.mockReturnValue(7200);

      const result = await createCacheEntry(mockPage, mockConfig, fixedDate);
      expect(result.ttlSeconds).toBe(7200);
    });

    it('should propagate errors from hashing a template', async () => {
      mockComputeFileHash.mockRejectedValue(new Error('File read error'));

      await expect(
        createCacheEntry(mockPage, mockConfig, fixedDate, undefined, rendered()),
      ).rejects.toThrow('File read error');
    });

    it('should record what the render read, false included', async () => {
      const result = await createCacheEntry(
        mockPage,
        mockConfig,
        fixedDate,
        'r',
        rendered({ reads: { collection: true, nav: false } }),
      );

      expect(result).toMatchObject({ readsCollection: true, readsNav: false });
      expect(hasRecordedReads(result)).toBe(true);
    });

    it('should leave the read flags out when the render did not report them', async () => {
      const result = await createCacheEntry(mockPage, mockConfig, fixedDate);

      expect(result).not.toHaveProperty('readsCollection');
      expect(hasRecordedReads(result)).toBe(false);
    });

    it('should tag a generated page with its key and label', async () => {
      const tagPage: PageModel = {
        ...mockPage,
        url: '/tags/css',
        frontMatter: { title: 'Tagged CSS', tags: ['topic'] },
        generated: { key: 'css', label: 'CSS', items: [], template: 'tags/[tag].md' },
      };

      const result = await createCacheEntry(tagPage, mockConfig, fixedDate);
      expect(result.tags).toEqual(['topic', 'css', 'CSS']);
    });
  });

  describe('updateCacheEntry', () => {
    const existingEntry = recordedEntry({
      inputsHash: 'old_inputs',
      renderedAt: new Date(fixedDate.getTime() - 3600000).toISOString(),
      ...(mockPage.publishedAt && { publishedAt: mockPage.publishedAt.toISOString() }),
      readsCollection: true,
      readsNav: true,
    });

    it("should replace the templates, lookups and reads with the new render's", async () => {
      const result = await updateCacheEntry(
        existingEntry,
        mockPage,
        mockConfig,
        fixedDate,
        'r',
        rendered({
          templates: [testLayoutPath, testFooterPath],
          templateLookups: [],
          reads: { collection: false, nav: true },
        }),
      );

      expect(result).toMatchObject({
        inputsHash: 'inputs123',
        deps: [testLayoutPath, testFooterPath],
        templateLookups: [],
        templatesRecorded: true,
        readsCollection: false,
        readsNav: true,
        renderedAt: fixedDate.toISOString(),
      });
    });

    it('should drop the read flags when an update has no render to take them from', async () => {
      const result = await updateCacheEntry(existingEntry, mockPage, mockConfig, fixedDate);

      expect(hasRecordedReads(result)).toBe(false);
    });

    it('should preserve existing publishedAt when page has no date', async () => {
      const { publishedAt: _, ...pageWithoutDate } = mockPage;

      const result = await updateCacheEntry(existingEntry, pageWithoutDate, mockConfig, fixedDate);
      expect(result.publishedAt).toBe(existingEntry.publishedAt);
    });

    it('should refresh the path and tags from the page', async () => {
      const result = await updateCacheEntry(
        { ...existingEntry, path: 'old.html', tags: ['page', 'blog', 'featured'] },
        mockPage,
        mockConfig,
        fixedDate,
      );

      expect(result.path).toBe('/test.html');
      expect(result.tags).toEqual(['page']);
    });
  });

  describe('Cache entry validation', () => {
    const invalid = (overrides: Record<string, unknown>) =>
      ({ ...recordedEntry(), ...overrides }) as unknown as CacheEntry;

    it.each([
      ['path is missing', { path: undefined }],
      ['inputsHash is missing', { inputsHash: undefined }],
      ['inputsHash is empty', { inputsHash: '' }],
      ['renderedAt is missing', { renderedAt: undefined }],
      ['renderedAt is empty', { renderedAt: '' }],
      ['ttlSeconds is not a number', { ttlSeconds: 'soon' }],
      ['ttlSeconds is NaN', { ttlSeconds: NaN }],
      ['ttlSeconds is Infinity', { ttlSeconds: Infinity }],
      ['deps is not an array', { deps: 'layout.eta' }],
      ['deps contains non-strings', { deps: [testLayoutPath, 123, null] }],
      ['tags is not an array', { tags: 'page' }],
      ['tags contains non-strings', { tags: ['valid', 42] }],
      ['publishedAt is not a string', { publishedAt: 12345 }],
      ['maxAgeCapDays is not a number', { maxAgeCapDays: 'forever' }],
      ['assetDeps is not a list of strings', { assetDeps: [42] }],
      ['images is not a list of strings', { images: [42] }],
      ['readsNav is not a boolean', { readsNav: 'yes' }],
      ['templatesRecorded is not a boolean', { templatesRecorded: 'yes' }],
      ['templateLookups is not a list', { templateLookups: 'partials/header' }],
      ['a lookup has no name', { templateLookups: [{ from: '', file: null }] }],
      ['a lookup file is not a string', { templateLookups: [{ name: 'x', file: 1 }] }],
    ])('should rebuild when %s', async (_, overrides) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(await check(invalid(overrides))).toBe(true);
      warn.mockRestore();
    });

    it('should rebuild when entry is null or not an object', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(await check(null as unknown as CacheEntry)).toBe(true);
      expect(await check('not an object' as unknown as CacheEntry)).toBe(true);
      warn.mockRestore();
    });

    it('should accept an entry with optional fields omitted', async () => {
      const { templateLookups: _, publishedAt: __, maxAgeCapDays: ___, ...entry } = recordedEntry();
      expect(await check(entry)).toBe(false);
    });
  });
});
