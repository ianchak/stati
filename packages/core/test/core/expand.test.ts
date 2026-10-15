import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expandPages,
  getPaginationUrl,
  getTemplateParam,
  paginateItems,
  replacePlaceholders,
  substituteFrontMatter,
} from '../../src/core/expand.js';
import type { Logger, PageModel, StatiConfig } from '../../src/types/index.js';

const SRC = `${process.cwd().replace(/\\/g, '/')}/site`;

function makePage(path: string, frontMatter: Record<string, unknown> = {}, extra = {}): PageModel {
  const name = path.replace(/\.md$/, '');
  const slug = name === 'index' ? '/' : `/${name.replace(/\/index$/, '')}`;
  return {
    slug,
    url: slug,
    sourcePath: `${SRC}/${path}`,
    frontMatter,
    content: '',
    ...extra,
  };
}

const config: StatiConfig = {
  srcDir: 'site',
  site: { title: 'Test', baseUrl: 'https://example.com' },
};

describe('replacePlaceholders', () => {
  it('replaces the parameter with the label', () => {
    expect(replacePlaceholders('Posts tagged {tag}', 'tag', 'CSS')).toBe('Posts tagged CSS');
    expect(replacePlaceholders('{tag} and {tag}', 'tag', 'JS')).toBe('JS and JS');
  });

  it('turns {{param}} into the literal {param}', () => {
    expect(replacePlaceholders('Write {{tag}} for {tag}', 'tag', 'CSS')).toBe(
      'Write {tag} for CSS',
    );
  });

  it('leaves other braces alone', () => {
    expect(replacePlaceholders('{author} {tags} { tag } {{other}}', 'tag', 'CSS')).toBe(
      '{author} {tags} { tag } {{other}}',
    );
  });

  it('inserts labels with replacement patterns literally', () => {
    expect(replacePlaceholders('{tag}', 'tag', '$& $1')).toBe('$& $1');
  });

  it('handles parameter names with a hyphen', () => {
    expect(replacePlaceholders('{release-year}', 'release-year', '2026')).toBe('2026');
  });
});

describe('substituteFrontMatter', () => {
  it('fills in nested strings and copies everything else', () => {
    const published = new Date('2026-01-01');
    const source = {
      title: 'About {tag}',
      seo: { description: '{tag} posts', keywords: ['{tag}', 'blog'] },
      count: 3,
      published,
      generate: { from: 'tags', note: '{tag}' },
      permalink: '/topics/[tag]/{tag}',
    };
    const result = substituteFrontMatter(source, 'tag', 'CSS');

    expect(result).toEqual({
      title: 'About CSS',
      seo: { description: 'CSS posts', keywords: ['CSS', 'blog'] },
      count: 3,
      published,
      generate: { from: 'tags', note: '{tag}' },
      permalink: '/topics/[tag]/{tag}',
    });
    expect(result.seo).not.toBe(source.seo);
    expect(result.published).not.toBe(published);
    expect(source.title).toBe('About {tag}');
  });
});

describe('pagination URLs', () => {
  it('follows the first page URL', () => {
    expect(getPaginationUrl('/blog', 'page', 1)).toBe('/blog');
    expect(getPaginationUrl('/blog', 'page', 2)).toBe('/blog/page/2');
    expect(getPaginationUrl('/blog/', 'page', 3)).toBe('/blog/page/3/');
    expect(getPaginationUrl('/', 'p', 2)).toBe('/p/2');
  });

  it('slices items and links pages', () => {
    const items = [1, 2, 3, 4, 5].map((n) => makePage(`p${n}.md`));
    const pages = paginateItems('/blog', items, { size: 2, path: 'page' });

    expect(pages.map((p) => p.items.map((item) => item.url))).toEqual([
      ['/p1', '/p2'],
      ['/p3', '/p4'],
      ['/p5'],
    ]);
    expect(pages[0]).toMatchObject({ pageNumber: 1, totalPages: 3, nextUrl: '/blog/page/2' });
    expect(pages[0]!.prevUrl).toBeUndefined();
    expect(pages[2]).toMatchObject({
      prevUrl: '/blog/page/2',
      urls: ['/blog', '/blog/page/2', '/blog/page/3'],
    });
    expect(pages[2]!.nextUrl).toBeUndefined();
  });

  it('always has a first page', () => {
    expect(paginateItems('/blog', [], { size: 10, path: 'page' })).toEqual([
      { pageNumber: 1, totalPages: 1, items: [], urls: ['/blog'] },
    ]);
  });
});

describe('getTemplateParam', () => {
  it('reads the name between brackets of the file name only', () => {
    expect(getTemplateParam(makePage('blog/tags/[tag].md'))).toBe('tag');
    expect(getTemplateParam(makePage('blog/[x]/post.md'))).toBeUndefined();
    expect(getTemplateParam(makePage('blog/post.md'))).toBeUndefined();
  });
});

describe('expandPages', () => {
  let warnings: string[];
  let logger: Logger;

  beforeEach(() => {
    warnings = [];
    logger = {
      info: vi.fn(),
      success: vi.fn(),
      warning: (message: string) => warnings.push(message),
      error: vi.fn(),
      status: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const blog = () => [
    makePage('index.md'),
    makePage('blog/index.md'),
    makePage('blog/a.md', { tags: ['CSS', 'css', 'Go'], year: 2025 }),
    makePage('blog/b.md', { tags: 'Go', year: 2026 }),
  ];

  it('expands keys from any string, number or list field', async () => {
    const template = makePage('blog/years/[year].md', {
      title: '{year}',
      generate: { from: 'year' },
    });
    const pages = await expandPages([...blog(), template], config, logger);
    const generated = pages.filter((page) => page.generated);

    expect(generated.map((page) => page.url)).toEqual(['/blog/years/2025', '/blog/years/2026']);
    expect(generated[0]!.frontMatter.title).toBe('2025');
    expect(generated[0]!.frontMatter.collection).toBe('/blog');
    expect(generated[0]!.slug).toBe('/blog/years/2025');
  });

  it('lists a page once when two of its values share a key', async () => {
    const template = makePage('blog/tags/[tag].md', { generate: { from: 'tags' } });
    const pages = await expandPages([...blog(), template], config, logger);
    const css = pages.find((page) => page.url === '/blog/tags/css')!;

    expect(css.generated!.items.map((page) => page.url)).toEqual(['/blog/a']);
    expect(warnings).toContainEqual(expect.stringContaining('"css" and "CSS" both become'));
    // A string value counts like a one-item list
    expect(pages.find((page) => page.url === '/blog/tags/go')!.generated!.items).toHaveLength(2);
  });

  it('skips a template with an invalid parameter name', async () => {
    const template = makePage('blog/[my tag].md', { generate: { from: 'tags' } });
    const pages = await expandPages([...blog(), template], config, logger);

    expect(pages).toHaveLength(4);
    expect(warnings).toContainEqual(
      expect.stringContaining('"my tag" is not a valid template parameter'),
    );
  });

  it('warns about generate outside a template, paginate in a template and unknown collections', async () => {
    const template = makePage('blog/tags/[tag].md', {
      paginate: 5,
      generate: { from: 'tags' },
    });
    const misplaced = makePage('blog/c.md', { generate: { from: 'tags' }, collection: '/nowhere' });
    await expandPages([...blog(), template, misplaced], config, logger);

    expect(warnings).toContainEqual(expect.stringContaining('use generate.paginate'));
    expect(warnings).toContainEqual(
      expect.stringContaining('blog/c.md: generate only works in a [param].md template'),
    );
    expect(warnings).toContainEqual(
      expect.stringContaining(
        'blog/c.md: collection "/nowhere" is not the URL of a collection index page',
      ),
    );
  });

  it('warns about a non-mapping generate value and an invalid generate.paginate', async () => {
    const listTemplate = makePage('blog/tags/[tag].md', { generate: 'tags' });
    const badPaginate = makePage('blog/years/[year].md', {
      generate: { from: 'year', paginate: { size: 2, path: 'a/b' } },
    });
    const pages = await expandPages([...blog(), listTemplate, badPaginate], config, logger);

    expect(warnings).toContainEqual(expect.stringContaining('generate must be a mapping'));
    expect(warnings).toContainEqual(
      expect.stringContaining('generate.paginate.path must be a single URL segment'),
    );
    // The invalid path falls back to the default segment
    expect(pages.find((page) => page.url === '/blog/years/2025')!.pagination!.urls).toEqual([
      '/blog/years/2025',
    ]);
  });

  it('validates collections.generate entries', async () => {
    const template = makePage('people/[person].md', { title: '{person}' });
    const entries = [
      { url: 'no-slash', template: 'people/[person].md' },
      { url: '/people/x', template: './people/[person]' },
      { url: '/people/y', template: 'people/[nobody].md' },
      { template: 'people/[person].md' },
      'not an entry',
    ];
    const pages = await expandPages(
      [...blog(), template],
      {
        ...config,
        collections: { generate: () => entries as never },
      },
      logger,
    );

    const generated = pages.filter((page) => page.generated);
    expect(generated.map((page) => page.url)).toEqual(['/people/x']);
    expect(generated[0]!.generated).toMatchObject({ key: 'x', label: 'x', items: [] });
    expect(generated[0]!.frontMatter.title).toBe('x');
    expect(warnings).toContainEqual(expect.stringContaining('needs a URL starting with "/"'));
    expect(warnings).toContainEqual(expect.stringContaining('"people/[nobody].md"'));
    expect(warnings).toContainEqual(
      expect.stringContaining('every entry needs a url and a template'),
    );
  });

  it('ignores a generate hook that does not return a list', async () => {
    const pages = await expandPages(
      blog(),
      {
        ...config,
        collections: { generate: () => 'nope' as never },
      },
      logger,
    );

    expect(pages).toHaveLength(4);
    expect(warnings).toContainEqual(expect.stringContaining('must return an array of pages'));
  });

  it('warns about a permalink without the parameter and uses the file location', async () => {
    const template = makePage('blog/tags/[tag].md', {
      permalink: '/tags/',
      generate: { from: 'tags' },
    });
    const pages = await expandPages([...blog(), template], config, logger);

    expect(pages.some((page) => page.url === '/blog/tags/go')).toBe(true);
    expect(warnings).toContainEqual(expect.stringContaining('permalink must contain [tag]'));
  });

  it('gives later pagination pages a copy of the front matter and the first page collection', async () => {
    const home = makePage('index.md', { title: 'Home', seo: { title: 'Home' }, paginate: 1 });
    const pages = await expandPages([home, ...blog().slice(1)], config, logger);
    const pageTwo = pages.find((page) => page.url === '/page/2')!;

    expect(home.pagination).toMatchObject({ pageNumber: 1, totalPages: 1 });
    // The root collection holds /blog only, so there is no second page
    expect(pageTwo).toBeUndefined();

    const listing = makePage('blog/index.md', { seo: { title: 'Blog' }, paginate: 1 });
    const expanded = await expandPages(
      [makePage('index.md'), listing, ...blog().slice(2)],
      config,
      logger,
    );
    const second = expanded.find((page) => page.url === '/blog/page/2')!;

    expect(second.frontMatter.collection).toBe('/blog');
    expect(second.frontMatter.seo).toEqual({ title: 'Blog' });
    expect(second.frontMatter.seo).not.toBe(listing.frontMatter.seo);
    expect(second.sourcePath).toBe(listing.sourcePath);
    expect(second.slug).toBe('/blog/page/2');
  });

  it('skips a pagination page whose URL a real page has', async () => {
    const listing = makePage('blog/index.md', { paginate: 1 });
    const clash = makePage('blog/page/2.md');
    const pages = await expandPages(
      [makePage('index.md'), listing, ...blog().slice(2), clash],
      config,
      logger,
    );

    expect(pages.filter((page) => page.url === '/blog/page/2')).toEqual([clash]);
    expect(warnings).toContainEqual(
      expect.stringContaining('Page 2 of blog/index.md would use the URL'),
    );
  });
});
