/**
 * Tests for the stylesheets a build links: their paths and hashed names, the links in pages,
 * and the files earlier builds left behind.
 * @module css/stylesheet.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  autoInjectStylesheets,
  createStylesheetPlan,
  getLinkedStylesheetPaths,
  getRenderStylesheetPath,
  getStaleStylesheetPaths,
  getStylesheetFingerprint,
  getStylesheetReferences,
  hashStylesheet,
  isHashableStylesheetPath,
  linksStylesheet,
  linksStylesheetWithIntegrity,
  rebaseRelativeUrls,
  relinkStylesheets,
  removeStaleStylesheets,
  rewriteStylesheetLinks,
  type StylesheetPlan,
} from '../../src/css/stylesheet.js';

const root = resolve('/project');
const outDir = join(root, 'dist');
const tailwind = { input: 'src/styles.css', output: 'dist/styles.css' };

function plan(overrides: Partial<StylesheetPlan> = {}): StylesheetPlan {
  return { ...createStylesheetPlan(tailwind, undefined, outDir, false, root), ...overrides };
}

describe('createStylesheetPlan', () => {
  it("names the output's path on the site and applies the production defaults", () => {
    expect(createStylesheetPlan(tailwind, undefined, outDir, false, root)).toEqual({
      inputFile: join(root, 'src', 'styles.css'),
      outputFile: join(root, 'dist', 'styles.css'),
      path: '/styles.css',
      name: 'styles',
      hash: true,
      minify: true,
      autoInject: true,
    });
  });

  it('keeps the name in development and applies the css settings', () => {
    expect(createStylesheetPlan(tailwind, { autoInject: false }, outDir, true, root)).toMatchObject(
      {
        hash: false,
        minify: false,
        autoInject: false,
      },
    );
  });

  it('uses forward slashes for an output in a subfolder', () => {
    const nested = createStylesheetPlan(
      { input: 'src/styles.css', output: join('dist', 'css', 'site.css') },
      undefined,
      outDir,
      false,
      root,
    );
    expect(nested).toMatchObject({ path: '/css/site.css', name: 'site' });
  });

  it('rejects an output outside the output directory', () => {
    expect(() =>
      createStylesheetPlan(
        { ...tailwind, output: 'public/styles.css' },
        undefined,
        outDir,
        false,
        root,
      ),
    ).toThrow(
      '--tailwind-output must be a file in the output directory, such as dist/styles.css (got public/styles.css).',
    );
    expect(() =>
      createStylesheetPlan({ ...tailwind, output: 'dist' }, undefined, outDir, false, root),
    ).toThrow('--tailwind-output must be a file in the output directory');
    expect(() =>
      createStylesheetPlan(
        { ...tailwind, output: 'dist-other/styles.css' },
        undefined,
        outDir,
        false,
        root,
      ),
    ).toThrow('--tailwind-output must be a file in the output directory');
  });

  it('rejects an output that is not a .css file', () => {
    expect(() =>
      createStylesheetPlan(
        { ...tailwind, output: 'dist/styles.scss' },
        undefined,
        outDir,
        false,
        root,
      ),
    ).toThrow('--tailwind-output must be a .css file (got dist/styles.scss).');
  });

  it('rejects a path an HTML attribute cannot hold as it is', () => {
    expect(() =>
      createStylesheetPlan(
        { ...tailwind, output: 'dist/my styles.css' },
        undefined,
        outDir,
        false,
        root,
      ),
    ).toThrow('--tailwind-output can hold only letters, digits, -, _, . and / in its path');
    expect(() =>
      createStylesheetPlan({ ...tailwind, output: 'dist/"x".css' }, undefined, outDir, false, root),
    ).toThrow('--tailwind-output can hold only');
  });
});

describe('getRenderStylesheetPath', () => {
  it('is the output path when the build does not hash', () => {
    expect(getRenderStylesheetPath(plan({ hash: false }))).toBe('/styles.css');
  });

  it('is a name made up for each hashed build, which no hashed file has', () => {
    const first = getRenderStylesheetPath(plan());
    const second = getRenderStylesheetPath(plan());

    expect(first).toMatch(/^\/_assets\/styles-pending-[0-9a-f]{16}\.css$/);
    expect(second).not.toBe(first);
    expect(first).not.toMatch(/^\/_assets\/styles-[0-9A-F]{8}\.css$/);
  });
});

describe('hashStylesheet', () => {
  it('names the rebased CSS after its content, in its own folder inside _assets/', () => {
    const css = 'body{background:url(img/bg.png)}';
    const rebased = 'body{background:url(/css/img/bg.png)}';
    const hash = createHash('sha256').update(rebased).digest('hex').slice(0, 8).toUpperCase();

    expect(hashStylesheet(css, '/css/site.css')).toEqual({
      css: rebased,
      path: `/_assets/css/site-${hash}.css`,
    });
    expect(hashStylesheet('a{}', '/styles.css').path).toMatch(
      /^\/_assets\/styles-[0-9A-F]{8}\.css$/,
    );
  });

  it('gives the same CSS at two paths two names', () => {
    expect(hashStylesheet('a{}', '/styles.css').path).not.toBe(
      hashStylesheet('a{}', '/vendor/styles.css').path,
    );
  });
});

describe('isHashableStylesheetPath', () => {
  it('takes .css paths an attribute holds as they are', () => {
    expect(isHashableStylesheetPath('/styles.css')).toBe(true);
    expect(isHashableStylesheetPath('/css/site.min.css')).toBe(true);
    for (const path of [
      '/styles.scss',
      'styles.css',
      '/my%20styles.css',
      '/a/../b.css',
      '//x.css',
    ]) {
      expect(isHashableStylesheetPath(path)).toBe(false);
    }
  });
});

describe('rebaseRelativeUrls', () => {
  it("resolves relative references against the stylesheet's own path", () => {
    const css =
      '@font-face{src:url(fonts/inter.woff2) format("woff2"),url("./fonts/inter.woff")}' +
      ".hero{background:url('../img/bg.svg?v=2#top')}";

    expect(rebaseRelativeUrls(css, '/css/site.css')).toBe(
      '@font-face{src:url(/css/fonts/inter.woff2) format("woff2"),url("/css/fonts/inter.woff")}' +
        ".hero{background:url('/img/bg.svg?v=2#top')}",
    );
    expect(rebaseRelativeUrls('a{b:url(../x.png)}', '/styles.css')).toBe('a{b:url(/x.png)}');
  });

  it('leaves root-relative, absolute, data, fragment and empty references alone', () => {
    const css =
      'a{b:url(/fonts/a.woff2);c:url(https://cdn.example/x.png);d:url(//cdn.example/y.png);' +
      'e:url("data:image/svg+xml;utf8,<svg/>");f:url(#mask);g:url();h:url("");i:url(\\2f x.png)}';

    expect(rebaseRelativeUrls(css, '/styles.css')).toBe(css);
  });

  it('resolves the relative @import strings plain CSS uses', () => {
    const css =
      '@import "base.css";@import \'../theme/dark.css\' screen;@import url(print.css) print;' +
      '@import "/root.css";@import "https://cdn.example/x.css";';

    expect(rebaseRelativeUrls(css, '/css/site.css')).toBe(
      '@import "/css/base.css";@import \'/theme/dark.css\' screen;@import url(/css/print.css) print;' +
        '@import "/root.css";@import "https://cdn.example/x.css";',
    );
  });

  it('resolves an @import string with no whitespace, or a comment, before it', () => {
    const css = '@import"base.css";@import/* theme */\'dark.css\';@import /* a */ /* b */ "c.css";';

    expect(rebaseRelativeUrls(css, '/css/site.css')).toBe(
      '@import"/css/base.css";@import/* theme */\'/css/dark.css\';@import /* a */ /* b */ "/css/c.css";',
    );
  });

  it('decodes an escaped reference, rebases it and escapes it again', () => {
    const css =
      'a{b:url(img\\(1\\).png)}c{d:url("a\\"b.png")}e{f:url(\'it\\\'s.png\')}' +
      'g{h:url(\\66 onts/a.woff2)}@import "th\\"eme.css";';

    expect(rebaseRelativeUrls(css, '/css/site.css')).toBe(
      "a{b:url(/css/img\\(1\\).png)}c{d:url(\"/css/a%22b.png\")}e{f:url('/css/it\\'s.png')}" +
        'g{h:url(/css/fonts/a.woff2)}@import "/css/th%22eme.css";',
    );
  });

  it('leaves the url() inside a data URI with escaped quotes alone', () => {
    const css =
      'a{b:url("data:image/svg+xml,<svg fill=\\"url(%23g)\\"/>")}' +
      "c{d:url('data:image/svg+xml,<svg fill=\\'url(%23g)\\'/>')}";

    expect(rebaseRelativeUrls(css, '/styles.css')).toBe(css);
    expect(rebaseRelativeUrls(`${css}g{h:url(x.png)}`, '/css/site.css')).toBe(
      `${css}g{h:url(/css/x.png)}`,
    );
  });

  it('decodes line continuations and invalid code points as CSS does', () => {
    const css = 'a{b:url("im\\\nage.png")}c{d:url("\\0 x.png")}e{f:url("\\110000 y.png")}';

    expect(rebaseRelativeUrls(css, '/css/site.css')).toBe(
      'a{b:url("/css/image.png")}c{d:url("/css/%EF%BF%BDx.png")}e{f:url("/css/%EF%BF%BDy.png")}',
    );
  });

  it('leaves url() text in strings and comments alone', () => {
    const css =
      '.label::after{content:"url(images/bg.svg)"}.note::before{content:\'@import "x.css"\'}' +
      '/* background: url(old.png); */.hero{background:url(images/bg.svg)}';

    expect(rebaseRelativeUrls(css, '/css/site.css')).toBe(
      '.label::after{content:"url(images/bg.svg)"}.note::before{content:\'@import "x.css"\'}' +
        '/* background: url(old.png); */.hero{background:url(/css/images/bg.svg)}',
    );
  });
});

describe('getStylesheetReferences', () => {
  it('lists the site paths of url() and @import references, once each', () => {
    const css =
      '@import "../styles.css" print;@import url(\'/base.css?v=2\');' +
      '.a{background:url(img/a.png#x)}.b{background:url("img/a.png")}' +
      '.c{background:url(https://cdn.example/x.png)}.d{background:url(//cdn.example/y.png)}' +
      '.e{background:url(data:image/png;base64,AA==)}.f{filter:url(#blur)}.g{background:url("")}' +
      '.h::after{content:"url(other.png)"}/* url(old.png) */';

    expect(getStylesheetReferences(css, '/css/site.css')).toEqual([
      '/styles.css',
      '/base.css',
      '/css/img/a.png',
    ]);
  });

  it('decodes escaped references', () => {
    expect(getStylesheetReferences('@import "st\\79 les.css";', '/print.css')).toEqual([
      '/styles.css',
    ]);
  });
});

describe('getStylesheetFingerprint', () => {
  it('holds the settings, not the file name', () => {
    expect(getStylesheetFingerprint(plan())).toEqual({
      path: '/styles.css',
      hash: true,
      autoInject: true,
    });
  });
});

describe('linksStylesheet', () => {
  it('finds a <link> to the path in either quote style and attribute order', () => {
    expect(linksStylesheet('<link rel="stylesheet" href="/styles.css">', '/styles.css')).toBe(true);
    expect(linksStylesheet("<LINK href='/styles.css' rel='stylesheet' />", '/styles.css')).toBe(
      true,
    );
  });

  it('finds an unquoted href, and one with a query or a fragment', () => {
    expect(linksStylesheet('<link rel=stylesheet href=/styles.css>', '/styles.css')).toBe(true);
    expect(linksStylesheet('<link rel="stylesheet" href="/styles.css?v=2">', '/styles.css')).toBe(
      true,
    );
    expect(linksStylesheet('<link href="/styles.css#print" rel="stylesheet">', '/styles.css')).toBe(
      true,
    );
  });

  it("finds a link under the site's own origin, not another one", () => {
    const site = 'https://Example.com/';
    const linked = (href: string) =>
      linksStylesheet(`<link rel="stylesheet" href="${href}">`, '/styles.css', site);

    expect(linked('https://example.com/styles.css')).toBe(true);
    expect(linked('//example.com/styles.css')).toBe(true);
    expect(linked('https://cdn.example/styles.css')).toBe(false);
    expect(linked('https://example.com.evil/styles.css')).toBe(false);
    expect(
      linksStylesheet(
        '<link rel="stylesheet" href="https://example.com/styles.css">',
        '/styles.css',
      ),
    ).toBe(false);
  });

  it('ignores other paths, other tags and escaped markup', () => {
    expect(linksStylesheet('<link rel="stylesheet" href="/styles.css.map">', '/styles.css')).toBe(
      false,
    );
    expect(linksStylesheet('<a href="/styles.css">CSS</a>', '/styles.css')).toBe(false);
    expect(linksStylesheet('<link data-href="/styles.css">', '/styles.css')).toBe(false);
    expect(
      linksStylesheet('<code>&lt;link href=&quot;/styles.css&quot;&gt;</code>', '/styles.css'),
    ).toBe(false);
  });

  it('ignores links in comments and in elements read as text or kept inert', () => {
    const link = '<link rel="stylesheet" href="/styles.css">';
    for (const html of [
      `<!-- ${link} -->`,
      `<script>document.head.insertAdjacentHTML('beforeend', '${link}')</script>`,
      `<template>${link}</template>`,
      `<style>/* ${link} */</style>`,
      `<textarea>${link}</textarea>`,
      `<title>${link}</title>`,
    ]) {
      expect(linksStylesheet(html, '/styles.css')).toBe(false);
      expect(linksStylesheet(`${html}${link}`, '/styles.css')).toBe(true);
    }
    expect(linksStylesheet(`<noscript>${link}</noscript>`, '/styles.css')).toBe(true);
  });

  it('reads no origin from a site URL that is invalid or has none', () => {
    const html = '<link rel="stylesheet" href="https://example.com/styles.css">';

    expect(linksStylesheet(html, '/styles.css', 'not a url')).toBe(false);
    expect(linksStylesheet(html, '/styles.css', 'file:///site/')).toBe(false);
    expect(linksStylesheet('<link rel="stylesheet" href="/styles.css">', '/styles.css', 'x')).toBe(
      true,
    );
  });

  it('resolves a relative link against the page when it has its URL', () => {
    const html = '<link rel="stylesheet" href="styles.css">';

    expect(linksStylesheet(html, '/styles.css')).toBe(false);
    expect(linksStylesheet(html, '/styles.css', undefined, '/about')).toBe(true);
    expect(linksStylesheet(html, '/styles.css', undefined, '/blog/')).toBe(false);
  });

  it('counts only links that apply the stylesheet', () => {
    const linked = (attributes: string) =>
      linksStylesheet(`<link ${attributes} href="/styles.css">`, '/styles.css');

    expect(linked('rel="preload" as="style"')).toBe(false);
    expect(linked('rel="alternate stylesheet" title="Dark"')).toBe(false);
    expect(linked('data-rel="stylesheet"')).toBe(false);
    expect(linked('')).toBe(false);
    expect(linked('rel="STYLESHEET"')).toBe(true);
    expect(linked("rel=' stylesheet  noopener '")).toBe(true);
  });
});

describe('autoInjectStylesheets', () => {
  const html = '<html><head><title>T</title></head><body></body></html>';

  it('adds the link before </head>', () => {
    expect(autoInjectStylesheets(html, ['/_assets/styles-[hash].css'])).toBe(
      '<html><head><title>T</title>    <link rel="stylesheet" href="/_assets/styles-[hash].css">\n</head><body></body></html>',
    );
  });

  it('leaves a page that links the path already, or has no </head>', () => {
    const linked = html.replace('</head>', '<link href="/styles.css" rel="stylesheet"></head>');
    expect(autoInjectStylesheets(linked, ['/styles.css'])).toBe(linked);
    const absolute = html.replace(
      '</head>',
      '<link href="https://example.com/styles.css" rel="stylesheet"></head>',
    );
    expect(autoInjectStylesheets(absolute, ['/styles.css'], 'https://example.com')).toBe(absolute);
    expect(autoInjectStylesheets('<p>fragment</p>', ['/styles.css'])).toBe('<p>fragment</p>');
    expect(autoInjectStylesheets(html, [])).toBe(html);
  });

  it('adds the link to a page that only preloads the path', () => {
    const preloaded = html.replace(
      '</head>',
      '<link rel="preload" href="/styles.css" as="style"></head>',
    );
    expect(autoInjectStylesheets(preloaded, ['/styles.css'])).toBe(
      preloaded.replace('</head>', '    <link rel="stylesheet" href="/styles.css">\n</head>'),
    );
  });
});

describe('getLinkedStylesheetPaths', () => {
  it('lists the paths of links that apply, offer or preload a stylesheet, once each', () => {
    const html =
      '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/styles.css?v=2">' +
      '<link rel="alternate stylesheet" href="/dark.css" title="Dark">' +
      '<link rel="preload" as="style" href="/print.css">' +
      '<link rel="preload" as="font" href="/fonts/a.woff2"><link rel="icon" href="/favicon.css">' +
      '<link rel="stylesheet" href="https://cdn.example/x.css"><link rel="stylesheet" href="data:text/css,a{}">';

    expect(getLinkedStylesheetPaths(html, '/')).toEqual(['/styles.css', '/dark.css', '/print.css']);
  });

  it("resolves relative links against the page and drops the site's origin", () => {
    const html =
      '<link rel="stylesheet" href="local.css"><link rel="stylesheet" href="../up.css">' +
      '<link rel="stylesheet" href="https://example.com/site.css"><link rel=stylesheet href=/a/../b.css>';

    expect(getLinkedStylesheetPaths(html, '/blog/post/', 'https://example.com')).toEqual([
      '/blog/post/local.css',
      '/blog/up.css',
      '/site.css',
      '/b.css',
    ]);
  });
});

describe('linksStylesheetWithIntegrity', () => {
  it('finds a link that loads the path with an integrity digest', () => {
    for (const link of [
      '<link rel="stylesheet" href="/styles.css" integrity="sha384-abc">',
      '<link rel="preload" as="style" href="/styles.css?v=2" INTEGRITY>',
      '<link rel="alternate stylesheet" href="https://example.com/styles.css" integrity="x">',
      '<link rel="stylesheet" href="../styles.css" integrity="x">',
    ]) {
      expect(
        linksStylesheetWithIntegrity(link, '/styles.css', '/blog/', 'https://example.com'),
      ).toBe(true);
    }
  });

  it('ignores links without a digest, to other paths, that load no stylesheet, or are not markup', () => {
    for (const html of [
      '<link rel="stylesheet" href="/styles.css">',
      '<link rel="stylesheet" href="/other.css" integrity="x">',
      '<link rel="preload" as="font" href="/styles.css" integrity="x">',
      '<link rel="stylesheet" integrity="x">',
      '<!-- <link rel="stylesheet" href="/styles.css" integrity="x"> -->',
      '<script>"<link rel=stylesheet href=/styles.css integrity=x>"</script>',
    ]) {
      expect(linksStylesheetWithIntegrity(html, '/styles.css', '/')).toBe(false);
    }
  });
});

describe('rewriteStylesheetLinks', () => {
  const targets = new Map([
    ['/styles.css', '/_assets/styles-0A1B2C3D.css'],
    ['/blog/local.css', '/_assets/blog/local-DEADBEEF.css'],
  ]);

  it("points each link at its target, keeping quotes, the site's origin and the query", () => {
    const html =
      '<link rel="stylesheet" href="/styles.css"><link href=\'/styles.css#print\' rel=\'stylesheet\'>' +
      '<link rel=stylesheet href=https://example.com/styles.css?v=2>' +
      '<link rel="preload" as="style" href="/styles.css"><link rel="stylesheet" href="local.css">';

    expect(rewriteStylesheetLinks(html, targets, '/blog/post', 'https://example.com')).toBe(
      '<link rel="stylesheet" href="/_assets/styles-0A1B2C3D.css">' +
        "<link href='/_assets/styles-0A1B2C3D.css#print' rel='stylesheet'>" +
        '<link rel=stylesheet href=https://example.com/_assets/styles-0A1B2C3D.css?v=2>' +
        '<link rel="preload" as="style" href="/_assets/styles-0A1B2C3D.css">' +
        '<link rel="stylesheet" href="/_assets/blog/local-DEADBEEF.css">',
    );
  });

  it('leaves other links, other tags and page text alone', () => {
    const html =
      '<link rel="canonical" href="/styles.css"><link rel="preload" as="font" href="/styles.css">' +
      '<a href="/styles.css">/styles.css</a><code>&lt;link rel="stylesheet" href="/styles.css"&gt;</code>' +
      '<link rel="stylesheet" href="https://cdn.example/styles.css"><link rel="stylesheet" href="/other.css">';

    expect(rewriteStylesheetLinks(html, targets, '/', 'https://example.com')).toBe(html);
    expect(rewriteStylesheetLinks(html, new Map(), '/')).toBe(html);
  });

  it('ignores a <link> tag that never closes', () => {
    expect(getLinkedStylesheetPaths('<link rel="stylesheet" href="/styles.css"', '/')).toEqual([]);
  });

  it('treats a comment or element left open as running to the end of the page', () => {
    const link = '<link rel="stylesheet" href="/styles.css">';
    expect(linksStylesheet(`<!-- ${link}`, '/styles.css')).toBe(false);
    expect(linksStylesheet(`<script>${link}`, '/styles.css')).toBe(false);
    expect(linksStylesheet(`${link}<SCRIPT>x</Script >${link}`, '/styles.css')).toBe(true);
    expect(getLinkedStylesheetPaths(`<TEMPLATE>${link}</template>${link}`, '/')).toEqual([
      '/styles.css',
    ]);
  });

  it('reads quoted attribute values, so a > or a <link> in one is text', () => {
    const media = '<link media="(width > 600px)" rel="stylesheet" href="/styles.css">';
    const inAttribute = '<div title=\'<link rel="stylesheet" href="/styles.css">\'></div>';

    expect(rewriteStylesheetLinks(`${inAttribute}${media}`, targets, '/')).toBe(
      `${inAttribute}<link media="(width > 600px)" rel="stylesheet" href="/_assets/styles-0A1B2C3D.css">`,
    );
    expect(linksStylesheet(inAttribute, '/styles.css')).toBe(false);
    expect(linksStylesheet(media, '/styles.css')).toBe(true);
  });

  it('reads attributes as browsers do: the first of a name, and none from inside a value', () => {
    const html =
      '<link title=" href=/other.css" rel=stylesheet href="/styles.css" href="/second.css">';

    expect(getLinkedStylesheetPaths(html, '/')).toEqual(['/styles.css']);
    expect(rewriteStylesheetLinks(html, targets, '/')).toBe(
      '<link title=" href=/other.css" rel=stylesheet href="/_assets/styles-0A1B2C3D.css" href="/second.css">',
    );
  });

  it('reads whitespace around =, and stops at a quote or doctype that never closes', () => {
    const spaced = '<link rel = "stylesheet" href =\n\'/styles.css\'>';

    expect(rewriteStylesheetLinks(spaced, targets, '/')).toBe(
      '<link rel = "stylesheet" href =\n\'/_assets/styles-0A1B2C3D.css\'>',
    );
    const link = '<link rel="stylesheet" href="/styles.css">';
    expect(linksStylesheet(`${link}<a title="${link}`, '/styles.css')).toBe(true);
    expect(getLinkedStylesheetPaths(`<a title='unclosed ${link}`, '/')).toEqual([]);
    expect(getLinkedStylesheetPaths(`<!doctype html ${link.replaceAll('>', '')}`, '/')).toEqual([]);
  });

  it('leaves a link with an integrity digest alone', () => {
    const html = '<link rel="stylesheet" href="/styles.css" integrity="sha384-abc" crossorigin>';

    expect(getLinkedStylesheetPaths(html, '/')).toEqual([]);
    expect(rewriteStylesheetLinks(html, targets, '/')).toBe(html);
    expect(linksStylesheet(html, '/styles.css')).toBe(true);
  });

  it('leaves links in comments and scripts alone, and rewrites them in noscript', () => {
    const link = '<link rel="stylesheet" href="/styles.css">';
    const inert = `<!-- ${link} --><script>const tag = '${link}';</script><template>${link}</template>`;

    expect(rewriteStylesheetLinks(`${inert}<noscript>${link}</noscript>`, targets, '/')).toBe(
      `${inert}<noscript><link rel="stylesheet" href="/_assets/styles-0A1B2C3D.css"></noscript>`,
    );
    expect(getLinkedStylesheetPaths(inert, '/')).toEqual([]);
  });
});

describe('stylesheet files', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'stati-stylesheet-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('relinkStylesheets', () => {
    const page = (name: string, url = '/') => ({ file: join(dir, name), url });

    it('points the stylesheet links of the pages that have one at the new names', async () => {
      const from = '/_assets/styles-0A1B2C3D.css';
      const linked = `<link rel="stylesheet" href="${from}"><link rel="preload" as="style" href="${from}">`;
      await writeFile(join(dir, 'a.html'), linked);
      await writeFile(join(dir, 'b.html'), '<p>no stylesheet</p>');
      await writeFile(
        join(dir, 'c.html'),
        '<link rel="stylesheet" href="/_assets/styles-DEADBEEF.css">',
      );

      const to = '/_assets/styles-E77989ED.css';
      const count = await relinkStylesheets(
        [page('a.html'), page('b.html'), page('c.html'), page('missing.html')],
        new Map([
          [from, to],
          ['/_assets/styles-DEADBEEF.css', to],
        ]),
      );

      expect(count).toBe(2);
      expect(await readFile(join(dir, 'a.html'), 'utf-8')).toBe(
        `<link rel="stylesheet" href="${to}"><link rel="preload" as="style" href="${to}">`,
      );
      expect(await readFile(join(dir, 'b.html'), 'utf-8')).toBe('<p>no stylesheet</p>');
      expect(await readFile(join(dir, 'c.html'), 'utf-8')).toBe(
        `<link rel="stylesheet" href="${to}">`,
      );
    });

    it("leaves page text, scripts and other sites' URLs alone", async () => {
      const from = '/_assets/styles-0A1B2C3D.css';
      const untouched =
        `<link rel="stylesheet" href="https://cdn.example${from}">` +
        `<script>const css = '${from}';</script><code>${from}</code>`;
      await writeFile(join(dir, 'a.html'), `${untouched}<link rel="stylesheet" href="${from}">`);

      await relinkStylesheets(
        [page('a.html')],
        new Map([[from, '/_assets/styles-E77989ED.css']]),
        'https://example.com',
      );

      expect(await readFile(join(dir, 'a.html'), 'utf-8')).toBe(
        `${untouched}<link rel="stylesheet" href="/_assets/styles-E77989ED.css">`,
      );
    });

    it('reads no page without an earlier path', async () => {
      await writeFile(join(dir, 'a.html'), '<link rel="stylesheet" href="/new.css">');

      const pages = [page('a.html')];
      expect(await relinkStylesheets(pages, new Map())).toBe(0);
      expect(
        await relinkStylesheets(
          pages,
          new Map([
            ['/new.css', '/new.css'],
            ['', '/new.css'],
          ]),
        ),
      ).toBe(0);
      expect(await readFile(join(dir, 'a.html'), 'utf-8')).toBe(
        '<link rel="stylesheet" href="/new.css">',
      );
    });

    it('replaces the earlier names of several stylesheets in one pass', async () => {
      await writeFile(
        join(dir, 'a.html'),
        '<link rel="stylesheet" href="/_assets/styles-0A1B2C3D.css"><link rel="stylesheet" href="../late.css">',
      );

      const count = await relinkStylesheets(
        [page('a.html', '/blog/post/')],
        new Map([
          ['/_assets/styles-0A1B2C3D.css', '/_assets/styles-E77989ED.css'],
          ['/blog/late.css', '/_assets/blog/late-DEADBEEF.css'],
        ]),
      );

      expect(count).toBe(1);
      expect(await readFile(join(dir, 'a.html'), 'utf-8')).toBe(
        '<link rel="stylesheet" href="/_assets/styles-E77989ED.css"><link rel="stylesheet" href="/_assets/blog/late-DEADBEEF.css">',
      );
    });

    it('handles more pages than it reads at once', async () => {
      const pages = await Promise.all(
        Array.from({ length: 70 }, async (_, i) => {
          await writeFile(join(dir, `page-${i}.html`), '<link rel=stylesheet href=/old.css>');
          return page(`page-${i}.html`);
        }),
      );

      expect(await relinkStylesheets(pages, new Map([['/old.css', '/new.css']]))).toBe(70);
      expect(await readFile(pages[69]!.file, 'utf-8')).toBe('<link rel=stylesheet href=/new.css>');
    });
  });

  describe('getStaleStylesheetPaths', () => {
    const current = '/_assets/styles-E77989ED.css';

    async function assets(...names: string[]): Promise<void> {
      await mkdir(join(dir, '_assets'), { recursive: true });
      for (const name of names) {
        await writeFile(join(dir, '_assets', name), '');
      }
    }

    it('lists the recorded name and every other hashed copy, never the current one', async () => {
      await assets('styles-DEADBEEF.css', 'styles-E77989ED.css', 'site-0A1B2C3D.css');

      const stale = await getStaleStylesheetPaths(
        dir,
        '/styles.css',
        '/_assets/styles-0A1B2C3D.css',
        current,
      );

      expect(stale.sort()).toEqual([
        '/_assets/styles-0A1B2C3D.css',
        '/_assets/styles-DEADBEEF.css',
      ]);
    });

    it('ignores a recorded path that is not a hashed copy of this stylesheet', async () => {
      const recordedPaths = [
        '',
        '/styles.css',
        '/_assets/site-0A1B2C3D.css',
        '/_assets/css/styles-0A1B2C3D.css',
        current,
      ];
      for (const recorded of recordedPaths) {
        expect(await getStaleStylesheetPaths(dir, '/styles.css', recorded, current)).toEqual([]);
      }
    });

    it("looks in the stylesheet's own folder inside _assets/", async () => {
      await assets('styles-DEADBEEF.css');
      await mkdir(join(dir, '_assets', 'css'));
      await writeFile(join(dir, '_assets', 'css', 'styles-0A1B2C3D.css'), '');

      expect(
        await getStaleStylesheetPaths(dir, '/css/styles.css', undefined, '/_assets/css/x.css'),
      ).toEqual(['/_assets/css/styles-0A1B2C3D.css']);
    });
  });

  describe('removeStaleStylesheets', () => {
    async function files(...paths: string[]): Promise<void> {
      for (const path of paths) {
        await mkdir(join(dir, path, '..'), { recursive: true });
        await writeFile(join(dir, path), '');
      }
    }

    it("deletes earlier hashed copies, never the current file or the dev server's output", async () => {
      await files(
        '_assets/styles-0A1B2C3D.css',
        '_assets/styles-DEADBEEF.css',
        '_assets/styles-E77989ED.css',
        'styles.css',
      );

      const removed = await removeStaleStylesheets(
        dir,
        '/styles.css',
        '/_assets/styles-E77989ED.css',
      );

      expect(removed.sort()).toEqual([
        '_assets/styles-0A1B2C3D.css',
        '_assets/styles-DEADBEEF.css',
      ]);
      expect(await readdir(join(dir, '_assets'))).toEqual(['styles-E77989ED.css']);
      expect(await readdir(dir)).toContain('styles.css');
    });

    it('only touches files named after this stylesheet', async () => {
      await files(
        '_assets/main-0A1B2C3D.js',
        '_assets/site-0A1B2C3D.css',
        '_assets/styles-notes.css',
        '_assets/styles-0a1b2c3d.css',
        '_assets/styles-E77989ED.css',
      );
      await mkdir(join(dir, '_assets', 'styles-ABCDEF12.css'));

      expect(
        await removeStaleStylesheets(dir, '/styles.css', '/_assets/styles-E77989ED.css'),
      ).toEqual([]);
      expect((await readdir(join(dir, '_assets'))).sort()).toEqual([
        'main-0A1B2C3D.js',
        'site-0A1B2C3D.css',
        'styles-0a1b2c3d.css',
        'styles-ABCDEF12.css',
        'styles-E77989ED.css',
        'styles-notes.css',
      ]);
    });

    it('keeps the output under its own name when the build does not hash', async () => {
      await files('_assets/styles-0A1B2C3D.css', 'styles.css');

      expect(await removeStaleStylesheets(dir, '/styles.css', '/styles.css')).toEqual([
        '_assets/styles-0A1B2C3D.css',
      ]);
      expect(await readdir(dir)).toContain('styles.css');
    });

    it('deletes every hashed copy of a stylesheet the build no longer builds', async () => {
      await files('_assets/styles-0A1B2C3D.css', '_assets/styles-DEADBEEF.css');

      expect((await removeStaleStylesheets(dir, '/styles.css')).sort()).toEqual([
        '_assets/styles-0A1B2C3D.css',
        '_assets/styles-DEADBEEF.css',
      ]);
    });

    it('deletes the copies of a stylesheet in a folder, not those of one at the root', async () => {
      await files('_assets/styles-0A1B2C3D.css', '_assets/css/styles-DEADBEEF.css');

      expect(await removeStaleStylesheets(dir, '/css/styles.css')).toEqual([
        '_assets/css/styles-DEADBEEF.css',
      ]);
      expect(await readdir(join(dir, '_assets'))).toContain('styles-0A1B2C3D.css');
    });

    it('is fine without an _assets folder', async () => {
      expect(await removeStaleStylesheets(dir, '/styles.css', '/styles.css')).toEqual([]);
    });
  });
});
