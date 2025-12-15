/**
 * Search index generator tests.
 * @module search/generator.test
 */

import { describe, it, expect } from 'vitest';
import {
  stripMarkdown,
  generateContentHash,
  buildBreadcrumb,
  extractSectionsFromMarkdown,
  shouldExcludePage,
  generateSearchIndex,
} from '../../src/search/generator.js';
import type { SearchConfig } from '../../src/types/search.js';
import type { PageModel, TocEntry } from '../../src/types/content.js';

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
