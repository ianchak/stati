import { describe, it, expect } from 'vitest';
import {
  getFirstPaginationPage,
  isCollectionIndexPage,
  isNotFoundPage,
  isVirtualPage,
} from '../../../src/core/utils/template-discovery.utils.js';
import type { PageModel } from '../../../src/types/index.js';

const page = (url: string): PageModel => ({
  slug: url,
  url,
  sourcePath: `site${url}.md`,
  frontMatter: {},
  content: '',
});

// The original O(n) scan, kept as the reference the indexed lookup must agree with
const scanIsCollectionIndexPage = (target: PageModel, allPages: PageModel[]): boolean => {
  if (target.url === '/') return true;
  const dir = target.url.endsWith('/') ? target.url : target.url + '/';
  return allPages.some((other) => other.url !== target.url && other.url.startsWith(dir));
};

const expectAgreesWithScan = (allPages: PageModel[]) => {
  for (const target of allPages) {
    expect(isCollectionIndexPage(target, allPages), target.url).toBe(
      scanIsCollectionIndexPage(target, allPages),
    );
  }
};

describe('isCollectionIndexPage', () => {
  it('treats the root page as an index', () => {
    expect(isCollectionIndexPage(page('/'), [page('/')])).toBe(true);
  });

  it('detects a nested index page with child pages', () => {
    const pages = [page('/'), page('/blog'), page('/blog/post')];
    expect(isCollectionIndexPage(pages[1]!, pages)).toBe(true);
    expect(isCollectionIndexPage(pages[2]!, pages)).toBe(false);
  });

  it('does not treat a nested page without children as an index', () => {
    const pages = [page('/'), page('/blog')];
    expect(isCollectionIndexPage(pages[1]!, pages)).toBe(false);
  });

  it('does not match URLs that only share a string prefix', () => {
    const pages = [page('/blog'), page('/blog-archive/post')];
    expect(isCollectionIndexPage(pages[0]!, pages)).toBe(false);
  });

  it('agrees with the full scan on trailing slashes, duplicates and odd URLs', () => {
    expectAgreesWithScan([
      page('/'),
      page('/a'),
      page('/a/'),
      page('/a/b'),
      page('/a/b/'),
      page('/a/b/c'),
      page('/dup'),
      page('/dup'),
      page('/dup/'),
      page('/solo/'),
      page('/x//y'),
      page('no-leading-slash'),
      page('no-leading-slash/child'),
      page(''),
    ]);
    expectAgreesWithScan([page('/dup'), page('/dup')]);
    expectAgreesWithScan([page('/only/'), page('/only/')]);
  });

  it('agrees with the full scan on random URL sets', () => {
    let seed = 42;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const segments = ['a', 'b', 'c', ''];
    for (let run = 0; run < 50; run++) {
      const pages = Array.from({ length: 30 }, () => {
        const depth = Math.floor(random() * 4);
        const parts = Array.from(
          { length: depth },
          () => segments[Math.floor(random() * segments.length)],
        );
        return page(`/${parts.join('/')}${random() < 0.2 ? '/' : ''}`);
      });
      expectAgreesWithScan(pages);
    }
  });

  it('reads page URLs once per array, at the first lookup', () => {
    const pages = [page('/blog'), page('/other/post')];
    expect(isCollectionIndexPage(pages[0]!, pages)).toBe(false);

    // Changes to the same array after the first lookup are not seen, whether or not
    // they change its length, so every lookup in a build gives the same answer
    pages[1]!.url = '/blog/post';
    expect(isCollectionIndexPage(pages[0]!, pages)).toBe(false);
    pages.push(page('/blog/another'));
    expect(isCollectionIndexPage(pages[0]!, pages)).toBe(false);

    // A new array (as each build loads) gets a new snapshot
    expect(isCollectionIndexPage(pages[0]!, [...pages])).toBe(true);
  });

  describe('generated and pagination pages', () => {
    const generated = (url: string): PageModel => ({
      ...page(url),
      generated: { key: 'k', label: 'K', items: [], template: 'tags/[tag].md' },
    });
    const later = (url: string, firstUrl: string): PageModel => ({
      ...page(url),
      pagination: { pageNumber: 2, totalPages: 2, items: [], urls: [firstUrl, url] },
    });

    it('does not let them turn a folder into a collection', () => {
      const tags = page('/tags');
      const pages = [page('/'), tags, generated('/tags/css'), later('/notes/page/2', '/notes')];
      expect(isCollectionIndexPage(tags, pages)).toBe(false);
      expect(isCollectionIndexPage(page('/notes'), pages)).toBe(false);
    });

    it('never treats a generated page as an index', () => {
      const css = generated('/tags/css');
      expect(isCollectionIndexPage(css, [css, page('/tags/css/intro')])).toBe(false);
    });

    it('treats a later pagination page like the first page of its listing', () => {
      const blog = page('/blog');
      const pages = [page('/'), blog, page('/blog/post'), later('/blog/page/2', '/blog')];
      expect(isCollectionIndexPage(pages[3]!, pages)).toBe(true);

      const about = page('/about');
      const aboutTwo = later('/about/page/2', '/about');
      expect(isCollectionIndexPage(aboutTwo, [page('/'), about, aboutTwo])).toBe(false);
      expect(isCollectionIndexPage(later('/x/page/2', '/x'), [page('/')])).toBe(false);
    });

    it('finds the first page of a listing only from a later page', () => {
      const blog: PageModel = {
        ...page('/blog'),
        pagination: { pageNumber: 1, totalPages: 2, items: [], urls: ['/blog', '/blog/page/2'] },
      };
      const two = later('/blog/page/2', '/blog');
      const pages = [page('/'), blog, two];

      expect(getFirstPaginationPage(two, pages)).toBe(blog);
      expect(getFirstPaginationPage(blog, pages)).toBeUndefined();
      expect(getFirstPaginationPage(page('/about'), pages)).toBeUndefined();
    });

    it('can tell virtual pages from pages loaded from Markdown', () => {
      expect(isVirtualPage(page('/a'))).toBe(false);
      expect(isVirtualPage(generated('/a'))).toBe(true);
      expect(isVirtualPage(later('/a/page/2', '/a'))).toBe(true);
      expect(
        isVirtualPage({
          ...page('/a'),
          pagination: { pageNumber: 1, totalPages: 2, items: [], urls: ['/a', '/a/page/2'] },
        }),
      ).toBe(false);
    });
  });
});

describe('isNotFoundPage', () => {
  it('matches the page written to 404.html or 404/index.html at the site root', () => {
    // A permalink without the leading slash is written to the same file
    for (const url of ['/404', '/404/', '/404/index', '404', '404/']) {
      expect(isNotFoundPage(page(url)), url).toBe(true);
    }
  });

  it('does not match other pages', () => {
    for (const url of ['/', '/docs/404', '/docs/404/', '/4040', '/404-page', '/404.html']) {
      expect(isNotFoundPage(page(url)), url).toBe(false);
    }
  });
});
