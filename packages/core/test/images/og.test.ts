import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inlineLocalImages, isOgImageExcluded } from '../../src/images/og.js';
import { compileUrlPatterns } from '../../src/core/utils/glob-patterns.utils.js';
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

  it('reads the file behind a path that starts with the base path, and a path that does not', async () => {
    const result = await inlineLocalImages(
      '<img src="/sub/images/logo.svg"><img src="/images/logo.svg"><img src="/subway/images/logo.svg">',
      { ...dirs, basePath: '/sub' },
    );

    const svg = Buffer.from('<svg/>').toString('base64');
    expect(result.html).toBe(
      `<img src="data:image/svg+xml;base64,${svg}"><img src="data:image/svg+xml;base64,${svg}"><img src="/subway/images/logo.svg">`,
    );
  });

  it('finds a file under a folder named like the base path as written', async () => {
    await mkdir(join(dirs.staticDir, 'sub'), { recursive: true });
    await writeFile(join(dirs.staticDir, 'sub', 'brand.png'), Buffer.from([4, 5, 6]));
    await writeFile(join(dirs.staticDir, 'brand.png'), Buffer.from([7, 8, 9]));
    await writeFile(join(dirs.staticDir, 'sub', 'only.png'), Buffer.from([1, 2, 3]));

    const result = await inlineLocalImages('<img src="/sub/brand.png"><img src="/sub/only.png">', {
      ...dirs,
      basePath: '/sub',
    });

    // The file without the base path wins when both exist; the other one is the fallback
    expect(result.html).toBe(
      '<img src="data:image/png;base64,BwgJ"><img src="data:image/png;base64,AQID">',
    );
    // Every file looked at is a dependency, so adding a missing candidate rebuilds the card
    expect(result.files).toEqual(
      [
        join(dirs.staticDir, 'brand.png'),
        join(dirs.staticDir, 'only.png'),
        join(dirs.staticDir, 'sub', 'only.png'),
      ].map(posix),
    );
  });

  it('strips a base path with escapes from the decoded path of an image', async () => {
    await mkdir(join(dirs.staticDir, 'my docs'), { recursive: true });
    await writeFile(join(dirs.staticDir, 'my docs', 'other.png'), Buffer.from([4, 5, 6]));

    const result = await inlineLocalImages(
      '<img src="/my%20docs/images/logo.svg"><img src="/my%20docs/bad.png">',
      { ...dirs, basePath: '/my%20docs' },
    );

    const svg = Buffer.from('<svg/>').toString('base64');
    expect(result.html).toBe(
      `<img src="data:image/svg+xml;base64,${svg}"><img src="/my%20docs/bad.png">`,
    );
  });

  it('uses a base path with a malformed escape as it is', async () => {
    const result = await inlineLocalImages('<img src="/100%25/images/logo.svg">', {
      ...dirs,
      basePath: '/100%',
    });

    expect(result.html).toBe(
      `<img src="data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}">`,
    );
  });

  it('records every file an image that does not exist yet could be', async () => {
    const result = await inlineLocalImages('<img src="/sub/images/later.png">', {
      ...dirs,
      basePath: '/sub',
    });

    expect(result.html).toBe('<img src="/sub/images/later.png">');
    expect(result.files).toEqual(
      [
        join(dirs.staticDir, 'images', 'later.png'),
        join(dirs.staticDir, 'sub', 'images', 'later.png'),
      ].map(posix),
    );
  });

  it('finds the source of a generated image by the path without the base path', async () => {
    const generated = (path: string) =>
      path === '/_img/hero-1a2b3c4d-960.webp' ? join(dirs.baseDir, 'mark.png') : undefined;

    const result = await inlineLocalImages(
      '<img src="/sub/_img/hero-1a2b3c4d-960.webp">',
      { ...dirs, basePath: '/sub' },
      generated,
    );

    expect(result.html).toBe('<img src="data:image/png;base64,AQID">');
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
});

describe('isOgImageExcluded', () => {
  const page = (url: string, frontMatter: PageModel['frontMatter'] = {}): PageModel => ({
    slug: url,
    url,
    sourcePath: `site${url}.md`,
    frontMatter,
    content: '',
  });

  const none = compileUrlPatterns([]);

  it('excludes the 404 page without an exclude pattern', () => {
    expect(isOgImageExcluded(page('/404'), none)).toBe(true);
    expect(isOgImageExcluded(page('/404/'), none)).toBe(true);
  });

  it('keeps other pages, including a page named 404 in a subfolder', () => {
    expect(isOgImageExcluded(page('/about'), none)).toBe(false);
    expect(isOgImageExcluded(page('/docs/404'), none)).toBe(false);
  });

  it('excludes pages with their own image or matching a pattern', () => {
    expect(isOgImageExcluded(page('/a', { seo: { openGraph: { image: '/a.png' } } }), none)).toBe(
      true,
    );
    expect(isOgImageExcluded(page('/a', { seo: { openGraph: { image: false } } }), none)).toBe(
      true,
    );
    expect(isOgImageExcluded(page('/drafts/a'), compileUrlPatterns(['/drafts/**']))).toBe(true);
  });

  // images.og.exclude matches the whole URL, unlike the sitemap's patterns
  it('exclude: a pattern without wildcards leaves out that URL only, not the URLs below it', () => {
    const exclude = compileUrlPatterns(['/drafts']);

    expect(isOgImageExcluded(page('/drafts'), exclude)).toBe(true);
    expect(isOgImageExcluded(page('/drafts/a'), exclude)).toBe(false);
  });
});
