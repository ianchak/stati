/**
 * Search index generator tests.
 * @module search/generator.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  stripMarkdown,
  generateContentHash,
  buildBreadcrumb,
  extractSectionsFromMarkdown,
  shouldExcludePage,
  generateSearchIndex,
  writeSearchIndex,
  computeSearchIndexFilename,
} from '../../src/search/generator.js';
import type { SearchConfig, SearchIndex } from '../../src/types/search.js';
import type { PageModel, TocEntry } from '../../src/types/content.js';

// Mock fs-extra functions
const { mockWriteFile, mockEnsureDir } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
  mockEnsureDir: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  default: {
    writeFile: mockWriteFile,
    ensureDir: mockEnsureDir,
  },
}));

describe('stripMarkdown', () => {
  it('removes code blocks', () => {
    const markdown = 'Before\n```js\nconst x = 1;\n```\nAfter';
    expect(stripMarkdown(markdown)).toBe('Before After');
  });

  it('removes inline code', () => {
    const markdown = 'Use `const` to declare constants';
    expect(stripMarkdown(markdown)).toBe('Use to declare constants');
  });

  it('removes images', () => {
    const markdown = 'Check this ![alt text](image.png) picture';
    expect(stripMarkdown(markdown)).toBe('Check this picture');
  });

  it('converts links to just text', () => {
    const markdown = 'Visit [our site](https://example.com) today';
    expect(stripMarkdown(markdown)).toBe('Visit our site today');
  });

  it('removes bold and italic markers', () => {
    const markdown = 'This is **bold** and *italic* and ***both***';
    expect(stripMarkdown(markdown)).toBe('This is bold and italic and both');
  });

  it('removes heading markers', () => {
    const markdown = '## Section Title\nContent here';
    expect(stripMarkdown(markdown)).toBe('Section Title Content here');
  });

  it('removes blockquote markers', () => {
    const markdown = '> This is a quote\n> Another line';
    expect(stripMarkdown(markdown)).toBe('This is a quote Another line');
  });

  it('removes list markers', () => {
    const markdown = '- Item one\n- Item two\n1. Numbered';
    expect(stripMarkdown(markdown)).toBe('Item one Item two Numbered');
  });

  it('handles empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('handles plain text', () => {
    expect(stripMarkdown('No markdown here')).toBe('No markdown here');
  });

  it('removes strikethrough text', () => {
    const markdown = 'This has ~~deleted~~ text';
    expect(stripMarkdown(markdown)).toBe('This has deleted text');
  });

  it('removes reference-style link definitions', () => {
    const markdown = 'Text here\n[id]: https://example.com "Title"\nMore text';
    expect(stripMarkdown(markdown)).toBe('Text here More text');
  });

  it('removes HTML tags', () => {
    const markdown = 'Text with <strong>HTML</strong> and <em>tags</em>';
    expect(stripMarkdown(markdown)).toBe('Text with HTML and tags');
  });

  it('removes horizontal rules', () => {
    const markdown = 'Before\n---\nAfter';
    expect(stripMarkdown(markdown)).toBe('Before After');
  });

  it('removes asterisk horizontal rules', () => {
    const markdown = 'Before\n***\nAfter';
    expect(stripMarkdown(markdown)).toBe('Before After');
  });

  it('removes underscore emphasis', () => {
    const markdown = 'This is __bold__ and _italic_';
    expect(stripMarkdown(markdown)).toBe('This is bold and italic');
  });
});

describe('generateContentHash', () => {
  it('generates 8-character hash', () => {
    const hash = generateContentHash('test content');
    expect(hash).toHaveLength(8);
  });

  it('produces consistent hashes', () => {
    const hash1 = generateContentHash('same content');
    const hash2 = generateContentHash('same content');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different content', () => {
    const hash1 = generateContentHash('content A');
    const hash2 = generateContentHash('content B');
    expect(hash1).not.toBe(hash2);
  });
});

describe('buildBreadcrumb', () => {
  it('returns title for root URL', () => {
    expect(buildBreadcrumb('/', 'Home')).toBe('Home');
  });

  it('returns title for empty URL', () => {
    expect(buildBreadcrumb('', 'Home')).toBe('Home');
  });

  it('builds breadcrumb from URL segments', () => {
    expect(buildBreadcrumb('/getting-started/installation', 'Installation')).toBe(
      'Getting Started > Installation',
    );
  });

  it('handles single segment URL', () => {
    expect(buildBreadcrumb('/about', 'About')).toBe('About');
  });

  it('handles deep nesting', () => {
    expect(buildBreadcrumb('/api/hooks/use-state', 'useState')).toBe('Api > Hooks > useState');
  });
});

describe('extractSectionsFromMarkdown', () => {
  const defaultConfig: SearchConfig = {
    enabled: true,
    headingLevels: [2, 3],
    maxContentLength: 1000,
    maxPreviewLength: 500,
  };

  it('creates page-level document', () => {
    const toc: TocEntry[] = [];
    const markdown = '# Page Title\n\nIntroduction text.';
    const docs = extractSectionsFromMarkdown(
      toc,
      markdown,
      '/test',
      'Test Page',
      undefined,
      defaultConfig,
    );

    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      id: '/test#top',
      url: '/test',
      anchor: '',
      title: 'Test Page',
      heading: 'Test Page',
      level: 1,
    });
  });

  it('extracts heading sections', () => {
    const toc: TocEntry[] = [
      { id: 'section-one', text: 'Section One', level: 2 },
      { id: 'subsection', text: 'Subsection', level: 3 },
    ];
    const markdown = `# Page Title

Intro

## Section One

Content of section one.

### Subsection

Content of subsection.`;
    const docs = extractSectionsFromMarkdown(
      toc,
      markdown,
      '/test',
      'Test Page',
      undefined,
      defaultConfig,
    );

    expect(docs).toHaveLength(3);
    expect(docs[1]).toMatchObject({
      id: '/test#section-one',
      anchor: 'section-one',
      heading: 'Section One',
      level: 2,
    });
    expect(docs[2]).toMatchObject({
      id: '/test#subsection',
      anchor: 'subsection',
      heading: 'Subsection',
      level: 3,
    });
  });

  it('ignores headings outside configured levels', () => {
    const toc: TocEntry[] = [{ id: 'h4', text: 'H4 Heading', level: 4 }];
    const markdown = `# Title

#### H4 Heading

Content`;
    const docs = extractSectionsFromMarkdown(
      toc,
      markdown,
      '/test',
      'Test',
      undefined,
      defaultConfig,
    );

    expect(docs).toHaveLength(1); // Only page-level
  });

  it('includes tags when provided', () => {
    const toc: TocEntry[] = [];
    const markdown = '# Title\n\nContent';
    const tags = ['tag1', 'tag2'] as const;
    const docs = extractSectionsFromMarkdown(toc, markdown, '/test', 'Test', tags, defaultConfig);

    expect(docs[0]?.tags).toEqual(['tag1', 'tag2']);
  });

  it('truncates content to maxContentLength', () => {
    const longContent = 'A'.repeat(2000);
    const toc: TocEntry[] = [{ id: 'section', text: 'Section', level: 2 }];
    const markdown = `## Section\n\n${longContent}`;
    const config: SearchConfig = { ...defaultConfig, maxContentLength: 100 };
    const docs = extractSectionsFromMarkdown(toc, markdown, '/test', 'Test', undefined, config);

    const sectionDoc = docs.find((d) => d.anchor === 'section');
    expect(sectionDoc?.content.length).toBeLessThanOrEqual(100);
  });
});

describe('shouldExcludePage', () => {
  const createPage = (overrides: Partial<PageModel> = {}): PageModel => ({
    slug: 'test',
    url: '/test',
    sourcePath: '/src/test.md',
    content: 'content',
    frontMatter: {},
    ...overrides,
  });

  it('excludes draft pages', () => {
    const page = createPage({ frontMatter: { draft: true } });
    const config: SearchConfig = { enabled: true };
    expect(shouldExcludePage(page, config)).toBe(true);
  });

  it('excludes home page by default', () => {
    const page = createPage({ url: '/' });
    const config: SearchConfig = { enabled: true };
    expect(shouldExcludePage(page, config)).toBe(true);
  });

  it('excludes empty URL (home page) by default', () => {
    const page = createPage({ url: '' });
    const config: SearchConfig = { enabled: true };
    expect(shouldExcludePage(page, config)).toBe(true);
  });

  it('includes home page when configured', () => {
    const page = createPage({ url: '/' });
    const config: SearchConfig = { enabled: true, includeHomePage: true };
    expect(shouldExcludePage(page, config)).toBe(false);
  });

  it('excludes pages matching exclude patterns', () => {
    const page = createPage({ url: '/private/secret' });
    const config: SearchConfig = { enabled: true, exclude: ['/private/**'] };
    expect(shouldExcludePage(page, config)).toBe(true);
  });

  it('includes non-matching pages', () => {
    const page = createPage({ url: '/public/page' });
    const config: SearchConfig = { enabled: true, exclude: ['/private/**'] };
    expect(shouldExcludePage(page, config)).toBe(false);
  });
});

describe('generateSearchIndex', () => {
  const createPage = (url: string, title: string, draft = false): PageModel => ({
    slug: url.split('/').pop() || 'index',
    url,
    sourcePath: `/src${url}.md`,
    content: '',
    frontMatter: { title, draft },
  });

  const createSearchablePage = (
    url: string,
    title: string,
    markdownContent: string,
    toc: TocEntry[] = [],
    draft = false,
  ) => ({
    page: createPage(url, title, draft),
    toc,
    markdownContent,
  });

  it('generates search index with correct structure', () => {
    const searchablePages = [createSearchablePage('/about', 'About', '# About\n\nAbout content')];
    const config: SearchConfig = { enabled: true, includeHomePage: true };

    const index = generateSearchIndex(searchablePages, config);

    expect(index).toMatchObject({
      version: '1.0.0',
      documentCount: expect.any(Number),
      generatedAt: expect.any(String),
      documents: expect.any(Array),
    });
  });

  it('excludes draft pages', () => {
    const searchablePages = [
      createSearchablePage('/published', 'Published', '# Published\n\nContent'),
      createSearchablePage('/draft', 'Draft', '# Draft\n\nContent', [], true),
    ];
    const config: SearchConfig = { enabled: true };

    const index = generateSearchIndex(searchablePages, config);

    const urls = index.documents.map((d) => d.url);
    expect(urls).toContain('/published');
    expect(urls).not.toContain('/draft');
  });

  it('sets correct ISO timestamp', () => {
    const searchablePages = [createSearchablePage('/test', 'Test', '# Test\n\nContent')];
    const config: SearchConfig = { enabled: true };

    const index = generateSearchIndex(searchablePages, config);

    expect(() => new Date(index.generatedAt)).not.toThrow();
  });
});

describe('writeSearchIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockEnsureDir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes search index to output directory', async () => {
    const searchIndex: SearchIndex = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      documentCount: 2,
      documents: [
        {
          id: '/test#top',
          url: '/test',
          anchor: '',
          title: 'Test',
          heading: 'Test',
          level: 1,
          content: 'Test content',
          breadcrumb: 'Test',
        },
      ],
    };

    const result = await writeSearchIndex(searchIndex, '/dist', 'search-index-abc123.json');

    expect(mockEnsureDir).toHaveBeenCalledWith('/dist');
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('search-index-abc123.json'),
      expect.any(String),
      'utf-8',
    );
    expect(result).toMatchObject({
      enabled: true,
      indexPath: '/search-index-abc123.json',
      documentCount: 2,
    });
  });

  it('returns correct metadata with document count', async () => {
    const searchIndex: SearchIndex = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      documentCount: 5,
      documents: [],
    };

    const result = await writeSearchIndex(searchIndex, '/output', 'search.json');

    expect(result.documentCount).toBe(5);
    expect(result.indexPath).toBe('/search.json');
    expect(result.enabled).toBe(true);
  });

  it('serializes index as compact JSON', async () => {
    const searchIndex: SearchIndex = {
      version: '1.0.0',
      generatedAt: '2024-01-01T00:00:00.000Z',
      documentCount: 1,
      documents: [],
    };

    await writeSearchIndex(searchIndex, '/dist', 'index.json');

    const writtenContent = mockWriteFile.mock.calls[0]?.[1] as string;
    // Compact JSON should not have newlines or indentation
    expect(writtenContent).not.toContain('\n');
    expect(JSON.parse(writtenContent)).toEqual(searchIndex);
  });

  describe('skipIfUnchanged optimization', () => {
    // Import the module to reset its internal state
    let writeSearchIndexModule: typeof import('../../src/search/generator.js');

    beforeEach(async () => {
      vi.clearAllMocks();
      mockWriteFile.mockResolvedValue(undefined);
      mockEnsureDir.mockResolvedValue(undefined);

      // Reset the module to clear cached state between tests
      vi.resetModules();
      writeSearchIndexModule = await import('../../src/search/generator.js');
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('writes file on first call even with skipIfUnchanged=true', async () => {
      const searchIndex: SearchIndex = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        documentCount: 2,
        documents: [
          {
            id: '/test#top',
            url: '/test',
            anchor: '',
            title: 'Test',
            heading: 'Test',
            level: 1,
            content: 'Test content',
            breadcrumb: 'Test',
          },
        ],
      };

      await writeSearchIndexModule.writeSearchIndex(searchIndex, '/dist', 'index.json', true);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    it('skips write when content hash matches (same count, same content)', async () => {
      const searchIndex: SearchIndex = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        documentCount: 2,
        documents: [
          {
            id: '/test#top',
            url: '/test',
            anchor: '',
            title: 'Test',
            heading: 'Test',
            level: 1,
            content: 'Test content',
            breadcrumb: 'Test',
          },
        ],
      };

      // First write
      await writeSearchIndexModule.writeSearchIndex(searchIndex, '/dist', 'index.json', true);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);

      // Second write with identical content - should skip
      await writeSearchIndexModule.writeSearchIndex(searchIndex, '/dist', 'index.json', true);
      expect(mockWriteFile).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('writes when document count changes (fast path)', async () => {
      const searchIndex1: SearchIndex = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        documentCount: 2,
        documents: [
          {
            id: '/test#top',
            url: '/test',
            anchor: '',
            title: 'Test',
            heading: 'Test',
            level: 1,
            content: 'Test content',
            breadcrumb: 'Test',
          },
        ],
      };

      const searchIndex2: SearchIndex = {
        ...searchIndex1,
        documentCount: 3,
        documents: [
          ...searchIndex1.documents,
          {
            id: '/new#top',
            url: '/new',
            anchor: '',
            title: 'New',
            heading: 'New',
            level: 1,
            content: 'New content',
            breadcrumb: 'New',
          },
        ],
      };

      await writeSearchIndexModule.writeSearchIndex(searchIndex1, '/dist', 'index.json', true);
      await writeSearchIndexModule.writeSearchIndex(searchIndex2, '/dist', 'index.json', true);

      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    it('writes when content changes but count stays same (hash detects change)', async () => {
      const searchIndex1: SearchIndex = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        documentCount: 2,
        documents: [
          {
            id: '/test#top',
            url: '/test',
            anchor: '',
            title: 'Test',
            heading: 'Test',
            level: 1,
            content: 'Original content',
            breadcrumb: 'Test',
          },
        ],
      };

      const searchIndex2: SearchIndex = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        documentCount: 2, // Same count
        documents: [
          {
            id: '/test#top',
            url: '/test',
            anchor: '',
            title: 'Test',
            heading: 'Test',
            level: 1,
            content: 'Modified content', // Different content
            breadcrumb: 'Test',
          },
        ],
      };

      await writeSearchIndexModule.writeSearchIndex(searchIndex1, '/dist', 'index.json', true);
      await writeSearchIndexModule.writeSearchIndex(searchIndex2, '/dist', 'index.json', true);

      // Should write both times because content hash differs
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    it('always writes when skipIfUnchanged=false', async () => {
      const searchIndex: SearchIndex = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        documentCount: 2,
        documents: [
          {
            id: '/test#top',
            url: '/test',
            anchor: '',
            title: 'Test',
            heading: 'Test',
            level: 1,
            content: 'Test content',
            breadcrumb: 'Test',
          },
        ],
      };

      // Multiple writes with skipIfUnchanged=false
      await writeSearchIndexModule.writeSearchIndex(searchIndex, '/dist', 'index.json', false);
      await writeSearchIndexModule.writeSearchIndex(searchIndex, '/dist', 'index.json', false);
      await writeSearchIndexModule.writeSearchIndex(searchIndex, '/dist', 'index.json', false);

      expect(mockWriteFile).toHaveBeenCalledTimes(3);
    });

    it('returns correct metadata when skipping write', async () => {
      const searchIndex: SearchIndex = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        documentCount: 5,
        documents: [],
      };

      // First write
      const result1 = await writeSearchIndexModule.writeSearchIndex(
        searchIndex,
        '/dist',
        'search.json',
        true,
      );
      expect(result1.documentCount).toBe(5);
      expect(result1.enabled).toBe(true);

      // Second write (skipped)
      const result2 = await writeSearchIndexModule.writeSearchIndex(
        searchIndex,
        '/dist',
        'search.json',
        true,
      );
      expect(result2.documentCount).toBe(5);
      expect(result2.enabled).toBe(true);
      expect(result2.indexPath).toBe('/search.json');
    });

    it('handles empty documents array', async () => {
      const searchIndex: SearchIndex = {
        version: '1.0.0',
        generatedAt: '2024-01-01T00:00:00.000Z',
        documentCount: 0,
        documents: [],
      };

      await writeSearchIndexModule.writeSearchIndex(searchIndex, '/dist', 'index.json', true);
      await writeSearchIndexModule.writeSearchIndex(searchIndex, '/dist', 'index.json', true);

      expect(mockWriteFile).toHaveBeenCalledTimes(1); // Should skip second write
    });
  });
});

describe('computeSearchIndexFilename', () => {
  it('returns hashed filename by default', () => {
    const config: SearchConfig = { enabled: true };
    const filename = computeSearchIndexFilename(config, 'build-123');

    expect(filename).toMatch(/^search-index-[a-f0-9]{8}\.json$/);
  });

  it('returns non-hashed filename when hashFilename is false', () => {
    const config: SearchConfig = { enabled: true, hashFilename: false };
    const filename = computeSearchIndexFilename(config, 'build-123');

    expect(filename).toBe('search-index.json');
  });

  it('uses custom indexName', () => {
    const config: SearchConfig = { enabled: true, indexName: 'custom-search', hashFilename: false };
    const filename = computeSearchIndexFilename(config);

    expect(filename).toBe('custom-search.json');
  });

  it('generates consistent hash for same build ID', () => {
    const config: SearchConfig = { enabled: true };
    const filename1 = computeSearchIndexFilename(config, 'same-build-id');
    const filename2 = computeSearchIndexFilename(config, 'same-build-id');

    expect(filename1).toBe(filename2);
  });

  it('generates different hash for different build IDs', () => {
    const config: SearchConfig = { enabled: true };
    const filename1 = computeSearchIndexFilename(config, 'build-1');
    const filename2 = computeSearchIndexFilename(config, 'build-2');

    expect(filename1).not.toBe(filename2);
  });

  it('generates hash using timestamp when no build ID provided', () => {
    const config: SearchConfig = { enabled: true };
    const filename = computeSearchIndexFilename(config);

    expect(filename).toMatch(/^search-index-[a-f0-9]{8}\.json$/);
  });
});

describe('buildBreadcrumb edge cases', () => {
  it('handles URL with only slashes', () => {
    // After filtering '/' which becomes [], segments.length === 0
    expect(buildBreadcrumb('///', 'Title')).toBe('Title');
  });

  it('handles URL that becomes empty after filtering', () => {
    expect(buildBreadcrumb('/', 'Home')).toBe('Home');
  });
});

describe('extractSectionsFromMarkdown edge cases', () => {
  const defaultConfig: SearchConfig = {
    enabled: true,
    headingLevels: [2, 3],
    maxContentLength: 1000,
    maxPreviewLength: 500,
  };

  it('skips empty sections', () => {
    const toc: TocEntry[] = [
      { id: 'empty-section', text: 'Empty Section', level: 2 },
      { id: 'filled-section', text: 'Filled Section', level: 2 },
    ];
    // Section with only whitespace should be skipped
    const markdown = `## Empty Section



## Filled Section

This has actual content.`;

    const docs = extractSectionsFromMarkdown(
      toc,
      markdown,
      '/test',
      'Test Page',
      undefined,
      defaultConfig,
    );

    // Should have page-level doc + filled section, but not empty section
    const emptySection = docs.find((d) => d.anchor === 'empty-section');
    const filledSection = docs.find((d) => d.anchor === 'filled-section');

    expect(emptySection).toBeUndefined();
    expect(filledSection).toBeDefined();
  });

  it('handles heading with markdown formatting in text', () => {
    const toc: TocEntry[] = [{ id: 'bold-heading', text: 'Bold Heading', level: 2 }];
    const markdown = `## **Bold Heading**

Content here.`;

    const docs = extractSectionsFromMarkdown(
      toc,
      markdown,
      '/test',
      'Test',
      undefined,
      defaultConfig,
    );

    // The heading should be matched despite markdown formatting
    expect(docs.length).toBeGreaterThan(1);
  });

  it('handles TOC entries with no matching headings in content', () => {
    const toc: TocEntry[] = [{ id: 'missing-heading', text: 'Missing Heading', level: 2 }];
    const markdown = `# Page Title

Some content but no h2 headings.`;

    const docs = extractSectionsFromMarkdown(
      toc,
      markdown,
      '/test',
      'Test',
      undefined,
      defaultConfig,
    );

    // Should only have page-level document
    expect(docs).toHaveLength(1);
    expect(docs[0]?.level).toBe(1);
  });

  it('uses default config values when not specified', () => {
    const toc: TocEntry[] = [{ id: 'section', text: 'Section', level: 2 }];
    const markdown = `## Section

Content`;
    const minimalConfig: SearchConfig = { enabled: true };

    const docs = extractSectionsFromMarkdown(
      toc,
      markdown,
      '/test',
      'Test',
      undefined,
      minimalConfig,
    );

    // Should work with defaults
    expect(docs.length).toBeGreaterThan(0);
  });

  it('omits tags property when no tags provided', () => {
    const toc: TocEntry[] = [];
    const markdown = '# Title';
    const config: SearchConfig = { enabled: true };

    const docs = extractSectionsFromMarkdown(toc, markdown, '/test', 'Test', undefined, config);

    expect(docs[0]?.tags).toBeUndefined();
  });

  it('omits tags property when empty array provided', () => {
    const toc: TocEntry[] = [];
    const markdown = '# Title';
    const config: SearchConfig = { enabled: true };

    const docs = extractSectionsFromMarkdown(toc, markdown, '/test', 'Test', [] as const, config);

    expect(docs[0]?.tags).toBeUndefined();
  });
});
