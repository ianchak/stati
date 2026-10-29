import { describe, expect, it } from 'vitest';
import { buildCollections, createCollectionView } from '../../src/core/collections.js';
import { findRelatedPages } from '../../src/core/related.js';
import type { PageModel } from '../../src/types/index.js';

function makePage(
  url: string,
  frontMatter: Record<string, unknown> = {},
  date?: string,
): PageModel {
  return {
    slug: url,
    url,
    sourcePath: `/site${url}.md`,
    frontMatter: { title: url, ...frontMatter },
    content: '',
    ...(date && { publishedAt: new Date(date) }),
  };
}

const urls = (pages: readonly PageModel[]) => pages.map((page) => page.url);

// Newest first, like the pages of a collection
const posts = [
  makePage('/blog/current', { tags: ['css', 'html'] }, '2026-05-01'),
  makePage('/blog/both-new', { tags: ['html', 'css'] }, '2026-04-01'),
  makePage('/blog/css-new', { tags: ['css'] }, '2026-03-01'),
  makePage('/blog/css-old', { tags: ['css'] }, '2026-01-01'),
  makePage('/blog/unrelated', { tags: ['rust'] }, '2026-02-01'),
  makePage('/blog/untagged', {}, '2026-02-15'),
];

describe('findRelatedPages', () => {
  it('ranks by shared tags, newest first on ties, and leaves out the page itself', () => {
    expect(urls(findRelatedPages(posts, '/blog/current'))).toEqual([
      '/blog/both-new',
      '/blog/css-new',
      '/blog/css-old',
    ]);
  });

  it('leaves out pages that share no value', () => {
    const related = urls(findRelatedPages(posts, '/blog/current', { limit: 10 }));

    expect(related).not.toContain('/blog/unrelated');
    expect(related).not.toContain('/blog/untagged');
  });

  it('limits the result, to 3 pages by default', () => {
    const many = [
      makePage('/p/a', { tags: ['x'] }),
      ...['b', 'c', 'd', 'e'].map((name) => makePage(`/p/${name}`, { tags: ['x'] })),
    ];

    expect(findRelatedPages(many, '/p/a')).toHaveLength(3);
    expect(findRelatedPages(many, '/p/a', { limit: 1 })).toHaveLength(1);
    expect(findRelatedPages(many, '/p/a', { limit: 0 })).toEqual([]);
    expect(findRelatedPages(many, '/p/a', { limit: 99 })).toHaveLength(4);
    expect(findRelatedPages(many, '/p/a', { limit: Infinity })).toHaveLength(4);
  });

  it('compares values without regard to case or surrounding spaces', () => {
    const mixed = [
      makePage('/a', { tags: ['CSS', ' Web '] }),
      makePage('/b', { tags: ['css'] }),
      makePage('/c', { tags: ['WEB', 'css'] }),
    ];

    expect(urls(findRelatedPages(mixed, '/a'))).toEqual(['/c', '/b']);
  });

  it('counts a repeated value once', () => {
    const repeated = [
      makePage('/a', { tags: ['x'] }),
      makePage('/b', { tags: ['x', 'X', 'x'] }),
      makePage('/c', { tags: ['x', 'y'] }),
      makePage('/d', { tags: ['y'] }),
    ];

    expect(urls(findRelatedPages(repeated, '/a'))).toEqual(['/b', '/c']);
  });

  it('returns nothing for a page without values, an unknown URL or a missing field', () => {
    expect(findRelatedPages(posts, '/blog/untagged')).toEqual([]);
    expect(findRelatedPages(posts, '/blog/missing')).toEqual([]);
    expect(findRelatedPages(posts, '/blog/current', { by: 'category' })).toEqual([]);
    expect(findRelatedPages([], '/blog/current')).toEqual([]);
    expect(findRelatedPages([makePage('/a', { tags: 'nope' }), makePage('/b', {})], '/b')).toEqual(
      [],
    );
  });

  it('ignores values that are not text or numbers', () => {
    const odd = [
      makePage('/a', { tags: ['x', 3, true, null, { y: 1 }, ' ', ''] }),
      makePage('/b', { tags: [true, null, { y: 1 }, ' '] }),
      makePage('/c', { tags: [3] }),
    ];

    expect(urls(findRelatedPages(odd, '/a'))).toEqual(['/c']);
  });

  it('compares another field, holding a list or a single value', () => {
    const items = [
      makePage('/a', { category: 'News', topics: ['x', 'y'] }),
      makePage('/b', { category: 'news' }),
      makePage('/c', { category: 'sport', topics: 'Y' }),
    ];

    expect(urls(findRelatedPages(items, '/a', { by: 'category' }))).toEqual(['/b']);
    expect(urls(findRelatedPages(items, '/a', { by: 'topics' }))).toEqual(['/c']);
    expect(urls(findRelatedPages(items, '/c', { by: 'topics' }))).toEqual(['/a']);
  });

  it('reads numbers as values', () => {
    const years = [makePage('/a', { series: 2026 }), makePage('/b', { series: '2026' })];

    expect(urls(findRelatedPages(years, '/a', { by: 'series' }))).toEqual(['/b']);
  });

  it('leaves out the URLs and pages in exclude, ignoring entries that name nothing', () => {
    const [, bothNew, cssNew] = posts;

    expect(
      urls(findRelatedPages(posts, '/blog/current', { exclude: ['/blog/both-new/', cssNew!] })),
    ).toEqual(['/blog/css-old']);
    expect(
      urls(
        findRelatedPages(posts, '/blog/current', {
          exclude: [bothNew, undefined, null, 5 as never, {} as never],
        }),
      ),
    ).toEqual(['/blog/css-new', '/blog/css-old']);
  });

  it('adds the bonus for pages in the same folder, but only to pages that share a value', () => {
    const news = [
      makePage('/news/world/a', { tags: ['election'] }, '2026-05-01'),
      makePage('/news/sport/b', { tags: ['election'] }, '2026-04-01'),
      makePage('/news/world/c', { tags: ['election'] }, '2026-01-01'),
      makePage('/news/world/d', { tags: ['weather'] }, '2026-06-01'),
    ];

    expect(urls(findRelatedPages(news, '/news/world/a'))).toEqual([
      '/news/sport/b',
      '/news/world/c',
    ]);
    expect(urls(findRelatedPages(news, '/news/world/a', { sameFolderBonus: 1 }))).toEqual([
      '/news/world/c',
      '/news/sport/b',
    ]);
    expect(urls(findRelatedPages(news, '/news/world/a', { sameFolderBonus: 0.5 }))).toEqual([
      '/news/world/c',
      '/news/sport/b',
    ]);
  });

  it('puts a page with more shared values ahead of a same-folder page by the bonus alone', () => {
    const news = [
      makePage('/n/world/a', { tags: ['x', 'y', 'z'] }),
      makePage('/n/sport/b', { tags: ['x', 'y', 'z'] }),
      makePage('/n/world/c', { tags: ['x'] }),
    ];

    expect(urls(findRelatedPages(news, '/n/world/a', { sameFolderBonus: 1 }))).toEqual([
      '/n/sport/b',
      '/n/world/c',
    ]);
  });

  it('finds the folder of top-level pages and of URLs with a trailing slash', () => {
    const top = [
      makePage('/a', { tags: ['x'] }),
      makePage('/sub/b', { tags: ['x'] }),
      makePage('/c', { tags: ['x'] }),
    ];
    expect(urls(findRelatedPages(top, '/a', { sameFolderBonus: 1 }))).toEqual(['/c', '/sub/b']);

    const slashed = [
      makePage('/n/world/a/', { tags: ['x'] }),
      makePage('/n/sport/b/', { tags: ['x'] }),
      makePage('/n/world/c/', { tags: ['x'] }),
    ];
    expect(urls(findRelatedPages(slashed, '/n/world/a/', { sameFolderBonus: 1 }))).toEqual([
      '/n/world/c/',
      '/n/sport/b/',
    ]);
  });

  it('finds the page with or without a trailing slash', () => {
    const slashed = [makePage('/b/one/', { tags: ['x'] }), makePage('/b/two/', { tags: ['x'] })];

    expect(urls(findRelatedPages(slashed, '/b/one'))).toEqual(['/b/two/']);
    expect(urls(findRelatedPages(slashed, '/b/one/'))).toEqual(['/b/two/']);
    expect(urls(findRelatedPages([makePage('/', { tags: ['x'] })], '/'))).toEqual([]);
  });

  it('lists draft pages like any other page of the collection', () => {
    const withDraft = [
      makePage('/a', { tags: ['x'] }, '2026-01-01'),
      makePage('/draft', { tags: ['x'], draft: true }, '2026-02-01'),
    ];

    expect(urls(findRelatedPages(withDraft, '/a'))).toEqual(['/draft']);
    expect(urls(findRelatedPages(withDraft, '/draft'))).toEqual(['/a']);
  });

  it('does not change the pages it is given', () => {
    const before = urls(posts);
    findRelatedPages(posts, '/blog/current');

    expect(urls(posts)).toEqual(before);
  });

  it.each([
    [{ limit: -1 }, 'limit'],
    [{ limit: 1.5 }, 'limit'],
    [{ limit: Number.NaN }, 'limit'],
    [{ limit: -Infinity }, 'limit'],
    [{ limit: '3' as never }, 'limit'],
    [{ by: '' }, 'by'],
    [{ by: 3 as never }, 'by'],
    [{ exclude: '/blog/a' as never }, 'exclude'],
    [{ sameFolderBonus: -1 }, 'sameFolderBonus'],
    [{ sameFolderBonus: Number.POSITIVE_INFINITY }, 'sameFolderBonus'],
    [{ sameFolderBonus: '1' as never }, 'sameFolderBonus'],
  ])('throws on the option %j', (options, name) => {
    expect(() => findRelatedPages(posts, '/blog/current', options)).toThrow(
      new RegExp(`related\\(\\): ${name}`),
    );
  });
});

describe('collection related()', () => {
  const index = makePage('/blog');
  const collection = () => buildCollections([index, ...posts]).byPath.get('/blog')!;

  it('picks from the pages of the collection, newest first on ties', () => {
    // Added out of order: ties still go to the newest page
    const shuffled = [index, posts[3]!, posts[2]!, posts[1]!, posts[0]!, posts[4]!];
    const data = buildCollections(shuffled).byPath.get('/blog')!;

    expect(urls(data.related('/blog/current'))).toEqual([
      '/blog/both-new',
      '/blog/css-new',
      '/blog/css-old',
    ]);
  });

  it('leaves out the collection index page, which is not a member', () => {
    const tagged = makePage('/blog', { tags: ['css'] });
    const data = buildCollections([tagged, ...posts]).byPath.get('/blog')!;

    expect(urls(data.related('/blog/css-new', { limit: 10 }))).not.toContain('/blog');
  });

  it('is empty for pages that are not in the collection', () => {
    expect(collection().related('/about')).toEqual([]);
    expect(collection().related('/blog')).toEqual([]);
  });

  it('records a collection read only when it is called', () => {
    const reads = { collection: false, nav: false };
    const view = createCollectionView(collection(), reads);

    // Spreading the template context passes the method along without calling it
    const { collection: spread } = { ...{ collection: view } };
    expect(reads.collection).toBe(false);
    expect(typeof spread.related).toBe('function');

    expect(urls(spread.related('/blog/current', { limit: 1 }))).toEqual(['/blog/both-new']);
    expect(reads.collection).toBe(true);
  });

  it('records the read when the call finds nothing', () => {
    const reads = { collection: false, nav: false };
    const view = createCollectionView(collection(), reads);

    expect(view.related('/blog/untagged')).toEqual([]);
    expect(reads.collection).toBe(true);
  });

  it('records the read when the options are wrong', () => {
    const reads = { collection: false, nav: false };
    const view = createCollectionView(collection(), reads);

    expect(() => view.related('/blog/current', { limit: -1 })).toThrow('limit');
    expect(reads.collection).toBe(true);
  });
});
