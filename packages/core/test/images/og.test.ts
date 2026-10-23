import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { inlineLocalImages, isOgImageExcluded } from '../../src/images/og.js';
import type { PageModel } from '../../src/types/index.js';

describe('inlineLocalImages', () => {
  let root: string;
  let dirs: { staticDir: string; baseDir: string; srcDir: string };
  const posix = (path: string) => path.replace(/\\/g, '/');

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'stati-og-inline-'));
    dirs = {
      staticDir: join(root, 'public'),
      srcDir: join(root, 'site'),
      baseDir: join(root, 'site', 'blog'),
    };
    await mkdir(join(dirs.staticDir, 'images'), { recursive: true });
    await mkdir(dirs.baseDir, { recursive: true });
    await writeFile(join(dirs.staticDir, 'images', 'logo.svg'), '<svg/>');
    await writeFile(join(dirs.baseDir, 'mark.png'), Buffer.from([1, 2, 3]));
    await writeFile(join(root, 'secret.png'), Buffer.from([9]));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('inlines static images by root-relative path and template images by relative path', async () => {
    const result = await inlineLocalImages(
      `<img src="/images/logo.svg" width="40"><img alt="Mark" src='./mark.png'>`,
      dirs,
    );

    const svg = Buffer.from('<svg/>').toString('base64');
    expect(result.html).toBe(
      `<img src="data:image/svg+xml;base64,${svg}" width="40"><img alt="Mark" src="data:image/png;base64,AQID">`,
    );
    expect(result.files).toEqual([
      posix(join(dirs.staticDir, 'images', 'logo.svg')),
      posix(join(dirs.baseDir, 'mark.png')),
    ]);
  });

  it('reads the file an HTML-escaped src names', async () => {
    const ampersand = join(dirs.staticDir, 'images', 'a&b.png');
    const apostrophe = join(dirs.staticDir, 'images', "jo's.png");
    await writeFile(ampersand, Buffer.from([1, 2, 3]));
    await writeFile(apostrophe, Buffer.from([1, 2, 3]));

    // Eta writes & as &amp; and ' as &#39;; hexadecimal references decode too
    const result = await inlineLocalImages(
      '<img src="/images/a&amp;b.png"><img src="/images/a&#x26;b.png"><img src="/images/jo&#39;s.png">',
      dirs,
    );
    expect(result.html).toBe('<img src="data:image/png;base64,AQID">'.repeat(3));
    expect(result.files).toEqual([ampersand, ampersand, apostrophe].map(posix));
  });

  it('inlines the source of an image Stati generates, which may not exist yet', async () => {
    const source = join(dirs.baseDir, 'mark.png');
    const generated = new Map([['/_img/mark-0123abcd-960.png', source]]);
    const result = await inlineLocalImages(
      '<picture><source type="image/avif" srcset="/_img/mark-0123abcd-960.avif 960w"><img src="/_img/mark-0123abcd-960.png" alt=""></picture>',
      dirs,
      (path) => generated.get(path),
    );

    expect(result.html).toBe(
      '<picture><source type="image/avif" srcset="/_img/mark-0123abcd-960.avif 960w"><img src="data:image/png;base64,AQID" alt=""></picture>',
    );
    expect(result.files).toEqual([posix(source)]);
  });

  it("keeps $ patterns in the tag's other attributes literal", async () => {
    const result = await inlineLocalImages(`<img alt="Save $' and $&" src="./mark.png">`, dirs);
    expect(result.html).toBe(`<img alt="Save $' and $&" src="data:image/png;base64,AQID">`);
  });

  it('tracks a missing image so the page rebuilds once it exists', async () => {
    const html = '<img src="/images/later.png">';
    expect(await inlineLocalImages(html, dirs)).toEqual({
      html,
      files: [posix(join(dirs.staticDir, 'images', 'later.png'))],
    });
  });

  it('leaves remote, data, unsupported and malformed sources and paths outside the project', async () => {
    const html = [
      '<img src="https://example.com/a.png">',
      '<img src="data:image/png;base64,AA">',
      '<img src="/images/doc.pdf">',
      '<img src="/images/%E0%A4%A.png">',
      '<img src="../../secret.png">',
      '<img src="/../secret.png">',
    ].join('');
    expect(await inlineLocalImages(html, dirs)).toEqual({ html, files: [] });
  });

  it('takes linear time on <img tags that never close', async () => {
    const started = performance.now();
    await inlineLocalImages('<img '.repeat(50_000), dirs);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('isOgImageExcluded', () => {
  const page = (url: string, frontMatter: PageModel['frontMatter'] = {}): PageModel => ({
    slug: url,
    url,
    sourcePath: `site${url}.md`,
    frontMatter,
    content: '',
  });

  it('excludes the 404 page without an exclude pattern', () => {
    expect(isOgImageExcluded(page('/404'), [])).toBe(true);
    expect(isOgImageExcluded(page('/404/'), [])).toBe(true);
  });

  it('keeps other pages, including a page named 404 in a subfolder', () => {
    expect(isOgImageExcluded(page('/about'), [])).toBe(false);
    expect(isOgImageExcluded(page('/docs/404'), [])).toBe(false);
  });

  it('excludes pages with their own image or matching a pattern', () => {
    expect(isOgImageExcluded(page('/a', { seo: { openGraph: { image: '/a.png' } } }), [])).toBe(
      true,
    );
    expect(isOgImageExcluded(page('/a', { seo: { openGraph: { image: false } } }), [])).toBe(true);
    expect(isOgImageExcluded(page('/drafts/a'), ['/drafts/**'])).toBe(true);
  });
});
