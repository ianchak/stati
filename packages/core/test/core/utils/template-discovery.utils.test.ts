import { describe, it, expect } from 'vitest';
import { isCollectionIndexPage } from '../../../src/core/utils/template-discovery.utils.js';
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

  it('picks up pages added to the same array after a lookup', () => {
    const pages = [page('/blog')];
    expect(isCollectionIndexPage(pages[0]!, pages)).toBe(false);
    pages.push(page('/blog/post'));
    expect(isCollectionIndexPage(pages[0]!, pages)).toBe(true);
  });
});
