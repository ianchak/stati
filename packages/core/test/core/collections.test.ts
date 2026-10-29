import { describe, expect, it } from 'vitest';
import {
  buildCollections,
  computePagesSummaryHash,
  createCollectionView,
  createSummaryHasher,
  DEFAULT_SUMMARY_FIELDS,
  findCollectionPath,
  getCollections,
  resolveCollectionPath,
  resolveSummaryFields,
  sortPagesByDate,
  type PageReads,
} from '../../src/core/collections.js';
import type { PageModel, PaginationData } from '../../src/types/index.js';

function makePage(url: string, frontMatter: Record<string, unknown> = {}, extra = {}): PageModel {
  return {
    slug: url,
    url,
    sourcePath: `/site${url === '/' ? '/index' : url}.md`,
    frontMatter: { title: url, ...frontMatter },
    content: `Body of ${url}`,
    ...extra,
  };
}

const urls = (pages: readonly PageModel[]) => pages.map((page) => page.url);

describe('buildCollections', () => {
  const home = makePage('/');
  const about = makePage('/about');
  const blog = makePage('/blog');
  const post = makePage('/blog/post', { tags: ['a'] });
  const year = makePage('/blog/2024');
  const recap = makePage('/blog/2024/recap', { tags: ['a', 'b'] });
  const orphan = makePage('/notes/loose');
  const pages = [home, about, blog, post, year, recap, orphan];

  it('creates a collection for each index page with every page below it', () => {
    const { byPath } = buildCollections(pages);

    expect([...byPath.keys()].sort()).toEqual(['/', '/blog', '/blog/2024']);
    expect(urls(byPath.get('/blog')!.pages)).toEqual([
      '/blog/post',
      '/blog/2024',
      '/blog/2024/recap',
    ]);
    expect(urls(byPath.get('/blog')!.children)).toEqual(['/blog/post', '/blog/2024']);
    expect(urls(byPath.get('/blog/2024')!.pages)).toEqual(['/blog/2024/recap']);
  });

  it('keeps the root collection shallow', () => {
    expect(urls(buildCollections(pages).byPath.get('/')!.pages)).toEqual(['/about', '/blog']);
  });

  it('groups by tag and fills in metadata', () => {
    const blogCollection = buildCollections(pages).byPath.get('/blog')!;

    expect(urls(blogCollection.pagesByTag.a!)).toEqual(['/blog/post', '/blog/2024/recap']);
    expect(blogCollection.metadata).toEqual({
      totalPages: 3,
      hasChildren: true,
      collectionPath: '/blog',
      collectionName: 'blog',
    });
  });

  it('supports an index page with a trailing-slash permalink', () => {
    const trailing = makePage('/docs/');
    const intro = makePage('/docs/intro');
    const { byPath } = buildCollections([trailing, intro]);

    expect(urls(byPath.get('/docs/')!.pages)).toEqual(['/docs/intro']);
  });

  it('never counts generated or pagination pages as members or as making a collection', () => {
    const listing: PaginationData = {
      pageNumber: 2,
      totalPages: 2,
      items: [],
      urls: ['/blog', '/blog/page/2'],
    };
    const pageTwo = makePage('/blog/page/2', {}, { pagination: listing });
    const tagPage = makePage(
      '/topics/css',
      {},
      {
        generated: { key: 'css', label: 'CSS', items: [], template: 'topics/[tag].md' },
      },
    );
    const topics = makePage('/topics');
    const { byPath } = buildCollections([home, blog, post, pageTwo, topics, tagPage]);

    expect(urls(byPath.get('/blog')!.pages)).toEqual(['/blog/post']);
    // /topics only has a generated page below it, so it is an ordinary top-level page
    expect(byPath.has('/topics')).toBe(false);
    expect(urls(byPath.get('/')!.pages)).toEqual(['/blog', '/topics']);
  });

  it('computes once per page list', () => {
    const list = [home, blog, post];
    expect(getCollections(list)).toBe(getCollections(list));
    expect(getCollections([...list])).not.toBe(getCollections(list));
  });

  it('groups tags named like object properties', () => {
    const tagged = makePage('/blog/odd', { tags: ['constructor', '__proto__', 'toString'] });
    const { pagesByTag } = buildCollections([home, blog, post, tagged]).byPath.get('/blog')!;
    const pagesTagged = (tag: string) => pagesByTag[tag];

    expect(Object.keys(pagesByTag).sort()).toEqual(['__proto__', 'a', 'constructor', 'toString']);
    expect(urls(pagesTagged('constructor')!)).toEqual(['/blog/odd']);
    expect(urls(pagesTagged('__proto__')!)).toEqual(['/blog/odd']);
    expect(pagesTagged('valueOf')).toBeUndefined();
  });

  it('gives a folder index page an empty collection before the folder has pages', () => {
    const emptyBlog = { ...makePage('/blog'), sourcePath: '/site/blog/index.md' };
    const { byPath } = buildCollections([home, about, emptyBlog]);

    expect(byPath.get('/blog')).toMatchObject({
      pages: [],
      children: [],
      recentPages: [],
      metadata: { totalPages: 0, hasChildren: false, collectionPath: '/blog' },
    });
    // A page that is not an index.md needs pages below it
    expect(buildCollections([home, about, makePage('/blog')]).byPath.has('/blog')).toBe(false);
  });
});

describe('resolveCollectionPath', () => {
  const home = makePage('/');
  const about = makePage('/about');
  const blog = makePage('/blog');
  const post = makePage('/blog/post');
  const deep = makePage('/blog/2024/recap');
  const docs = makePage('/docs');
  const intro = makePage('/docs/intro');
  const loose = makePage('/notes/loose');
  const named = makePage('/latest', { collection: '/docs' });
  const all = [home, about, blog, post, deep, docs, intro, loose, named];

  it('gives index pages their own collection', () => {
    expect(resolveCollectionPath(home, all)).toBe('/');
    expect(resolveCollectionPath(blog, all)).toBe('/blog');
  });

  it('gives other pages the nearest collection they belong to', () => {
    expect(resolveCollectionPath(post, all)).toBe('/blog');
    expect(resolveCollectionPath(deep, all)).toBe('/blog');
    expect(resolveCollectionPath(about, all)).toBe('/');
    expect(resolveCollectionPath(loose, all)).toBeUndefined();
  });

  it('uses the collection the front matter names, in any slash style', () => {
    expect(resolveCollectionPath(named, all)).toBe('/docs');
    const index = getCollections(all);
    expect(findCollectionPath(index, 'docs')).toBe('/docs');
    expect(findCollectionPath(index, '/docs/')).toBe('/docs');
    expect(findCollectionPath(index, ' /blog ')).toBe('/blog');
  });

  it('falls back to the default collection when the named one does not exist', () => {
    const page = makePage('/blog/other', { collection: '/missing' });
    expect(resolveCollectionPath(page, [...all, page])).toBe('/blog');
    expect(findCollectionPath(getCollections(all), 42)).toBeUndefined();
    expect(findCollectionPath(getCollections(all), '')).toBeUndefined();
    // Without a home page there is no root collection to name
    expect(findCollectionPath(getCollections([blog, post]), '/')).toBeUndefined();
  });

  it('keeps an empty collection for its index page and pages that name it', () => {
    // site/posts/index.md after the last post is deleted
    const posts = { ...makePage('/posts'), sourcePath: '/site/posts/index.md' };
    const latest = makePage('/latest', { collection: '/posts' });
    const list = [home, about, posts, latest];

    expect(resolveCollectionPath(posts, list)).toBe('/posts');
    expect(resolveCollectionPath(latest, list)).toBe('/posts');
  });

  it('gives a template the nearest collection with pages, past an empty one', () => {
    const tagsIndex = { ...makePage('/blog/tags'), sourcePath: '/site/blog/tags/index.md' };
    const template = makePage('/blog/tags/[tag]');
    const list = [...all, tagsIndex];

    expect(resolveCollectionPath(tagsIndex, list)).toBe('/blog/tags');
    expect(resolveCollectionPath(template, list)).toBe('/blog');
  });

  it('gives later pagination pages the collection of the first page', () => {
    const pagination: PaginationData = {
      pageNumber: 2,
      totalPages: 2,
      items: [],
      urls: ['/', '/page/2'],
    };
    const pageTwo = makePage('/page/2', {}, { pagination });
    expect(resolveCollectionPath(pageTwo, [...all, pageTwo])).toBe('/');
  });

  it('gives generated pages only the collection their front matter names', () => {
    const generated = { key: 'css', label: 'CSS', items: [], template: 'blog/tags/[tag].md' };
    const withCollection = makePage('/blog/tags/css', { collection: '/blog' }, { generated });
    const without = makePage('/blog/tags/js', {}, { generated: { ...generated, key: 'js' } });
    const list = [...all, withCollection, without];

    expect(resolveCollectionPath(withCollection, list)).toBe('/blog');
    expect(resolveCollectionPath(without, list)).toBeUndefined();
  });
});

describe('createCollectionView', () => {
  const blog = makePage('/blog');
  const older = makePage('/blog/older', {}, { publishedAt: new Date('2026-01-01') });
  const newer = makePage('/blog/newer', {}, { publishedAt: new Date('2026-02-01') });
  const data = () => buildCollections([blog, older, newer]).byPath.get('/blog')!;

  it('records a read only when a property is read', () => {
    const reads: PageReads = { collection: false, nav: false };
    const view = createCollectionView(data(), reads);

    const context = { collection: view };
    const spread = { ...context };
    expect(Object.keys(view)).toHaveLength(6);
    expect(reads.collection).toBe(false);

    expect(urls(spread.collection.recentPages)).toEqual(['/blog/newer', '/blog/older']);
    expect(reads.collection).toBe(true);
  });

  it('copies arrays so a template that sorts in place cannot change other pages', () => {
    const shared = data();
    const first = createCollectionView(shared, { collection: false, nav: false });
    first.recentPages.reverse();
    first.pagesByTag.extra = [];
    first.metadata.totalPages = 99;

    const second = createCollectionView(shared, { collection: false, nav: false });
    expect(urls(second.recentPages)).toEqual(['/blog/newer', '/blog/older']);
    expect(second.pagesByTag.extra).toBeUndefined();
    expect(second.metadata.totalPages).toBe(2);
    // Within one render, a property returns the same copy each time
    expect(first.recentPages).toBe(first.recentPages);
  });

  it('keeps tags named like object properties plain keys in the copy', () => {
    const tagged = makePage('/blog/odd', { tags: ['constructor'] });
    const shared = buildCollections([blog, older, tagged]).byPath.get('/blog')!;
    const view = createCollectionView(shared, { collection: false, nav: false });
    const byTag = view.pagesByTag;
    const tag = (name: string) => byTag[name];

    expect(urls(tag('constructor')!)).toEqual(['/blog/odd']);
    expect(tag('toString')).toBeUndefined();
    expect(Object.getPrototypeOf(view.metadata)).toBe(Object.prototype);
  });

  it('keeps assignments within the view', () => {
    const shared = data();
    const view = createCollectionView(shared, { collection: false, nav: false });
    view.pages = [];

    expect(view.pages).toEqual([]);
    expect(shared.pages).toHaveLength(2);
  });
});

describe('collection summaries', () => {
  const post = makePage(
    '/blog/post',
    { title: 'Post', description: 'About', tags: ['a'], mood: 'calm' },
    { publishedAt: new Date('2026-01-01') },
  );
  const hash = (page: PageModel, fields = DEFAULT_SUMMARY_FIELDS) =>
    computePagesSummaryHash([page], fields);

  it('changes with the URL, the publish date and the summary fields', () => {
    const base = hash(post);

    expect(hash({ ...post, url: '/blog/moved' })).not.toBe(base);
    expect(hash({ ...post, publishedAt: new Date('2026-02-01') })).not.toBe(base);
    expect(hash({ ...post, frontMatter: { ...post.frontMatter, title: 'New' } })).not.toBe(base);
    expect(hash({ ...post, frontMatter: { ...post.frontMatter, draft: true } })).not.toBe(base);
  });

  it('ignores the body and other front matter unless listed', () => {
    const base = hash(post);

    expect(hash({ ...post, content: 'Edited' })).toBe(base);
    expect(hash({ ...post, frontMatter: { ...post.frontMatter, mood: 'busy' } })).toBe(base);
    expect(hash({ ...post, content: 'Edited' }, ['content'])).not.toBe(hash(post, ['content']));
    expect(
      hash({ ...post, frontMatter: { ...post.frontMatter, mood: 'busy' } }, ['mood']),
    ).not.toBe(hash(post, ['mood']));
  });

  it('includes the word count and the reading time when they are listed', () => {
    const counted = { ...post, wordCount: 300, readingTime: 1 };
    const fields = [...DEFAULT_SUMMARY_FIELDS, 'readingTime'];

    // Without the field, neither value changes the summary
    expect(hash({ ...counted, wordCount: 900, readingTime: 4 })).toBe(hash(counted));
    expect(hash({ ...counted, readingTime: 2 }, fields)).not.toBe(hash(counted, fields));
    expect(hash({ ...counted, wordCount: 305 }, fields)).toBe(hash(counted, fields));
    expect(hash({ ...counted, wordCount: 305 }, ['wordCount'])).not.toBe(
      hash(counted, ['wordCount']),
    );
  });

  it('also hashes front matter of the same name, for listings that show it', () => {
    const counted = { ...post, wordCount: 300, readingTime: 1 };
    const written = (readingTime: number) => ({
      ...counted,
      frontMatter: { ...counted.frontMatter, readingTime, wordCount: readingTime * 100 },
    });

    expect(hash(written(5), ['readingTime'])).not.toBe(hash(counted, ['readingTime']));
    expect(hash(written(5), ['readingTime'])).not.toBe(hash(written(6), ['readingTime']));
    expect(hash(written(5), ['wordCount'])).not.toBe(hash(written(6), ['wordCount']));
    // Without the field in the summary, front matter of that name changes nothing
    expect(hash(written(5))).toBe(hash(counted));
  });

  it('hashes a page without counts as having none', () => {
    expect(hash(post, ['readingTime'])).toBe(hash({ ...post }, ['readingTime']));
    expect(hash(post, ['readingTime'])).not.toBe(
      hash({ ...post, readingTime: 1 }, ['readingTime']),
    );
    expect(hash(post, ['wordCount'])).not.toBe(hash({ ...post, wordCount: 0 }, ['wordCount']));
  });

  it('changes with the order of the pages', () => {
    const other = makePage('/blog/other');
    expect(computePagesSummaryHash([post, other], DEFAULT_SUMMARY_FIELDS)).not.toBe(
      computePagesSummaryHash([other, post], DEFAULT_SUMMARY_FIELDS),
    );
  });

  it('reads the summary fields from the config', () => {
    expect(resolveSummaryFields({ site: { title: 't', baseUrl: 'b' } })).toBe(
      DEFAULT_SUMMARY_FIELDS,
    );
    expect(
      resolveSummaryFields({
        site: { title: 't', baseUrl: 'b' },
        collections: { summaryFields: ['title', 7 as unknown as string, 'image'] },
      }),
    ).toEqual(['title', 'image']);
  });

  it('hashes each collection once per build', () => {
    const blog = makePage('/blog');
    const list = [blog, post];
    const hasher = createSummaryHasher(list, DEFAULT_SUMMARY_FIELDS);

    const first = hasher.collection('/blog');
    post.frontMatter.title = 'Changed after hashing';
    expect(hasher.collection('/blog')).toBe(first);
    expect(hasher.collection('/missing')).toBe('none');
    expect(hasher.pages([post])).not.toBe(computePagesSummaryHash([], DEFAULT_SUMMARY_FIELDS));
  });
});

describe('sortPagesByDate', () => {
  it('sorts undated pages by title, whatever type the title has', () => {
    const pages = [
      makePage('/b', { title: 'Beta' }),
      makePage('/n', { title: 42 }),
      makePage('/a', { title: 'Alpha' }),
      makePage('/y', { title: 1984 }),
    ];

    expect(urls(sortPagesByDate(pages))).toEqual(['/y', '/n', '/a', '/b']);
  });
});
