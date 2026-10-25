import { describe, expect, it, vi } from 'vitest';
import { BasePathLinkReport, findUnprefixedLinks } from '../../src/core/base-path-links.js';

describe('findUnprefixedLinks', () => {
  it('finds href and src values that start with / but not with the base path', () => {
    const html = `<head><link rel="stylesheet" href="/styles.css"><script src="/app.js"></script></head>
<body><a href="/about">About</a><img src="/logo.png" alt=""><a href="/">Home</a>
<video src="/v.mp4"></video><source src="/v.webm"><iframe src="/embed"></iframe><use href="/icons.svg#x"></use></body>`;

    expect(findUnprefixedLinks(html, '/sub')).toEqual([
      { attribute: 'href', value: '/styles.css' },
      { attribute: 'src', value: '/app.js' },
      { attribute: 'href', value: '/about' },
      { attribute: 'src', value: '/logo.png' },
      { attribute: 'href', value: '/' },
      { attribute: 'src', value: '/v.mp4' },
      { attribute: 'src', value: '/v.webm' },
      { attribute: 'src', value: '/embed' },
      { attribute: 'href', value: '/icons.svg#x' },
    ]);
  });

  it('accepts values that start with the base path and values that are not site paths', () => {
    const html = `<a href="/sub">a</a><a href="/sub/">b</a><a href="/sub/x?y=1">c</a><a href="/sub#z">d</a>
<a href="//cdn.test/x">e</a><a href="https://x.test/">f</a><a href="mailto:a@b.test">g</a>
<a href="#top">h</a><a href="?p=2">i</a><a href="rel/x">j</a><a href="./y">k</a><a href="">l</a><a>m</a>`;

    expect(findUnprefixedLinks(html, '/sub')).toEqual([]);
  });

  it('flags a path that only begins like the base path', () => {
    expect(findUnprefixedLinks('<a href="/subway">x</a>', '/sub')).toEqual([
      { attribute: 'href', value: '/subway' },
    ]);
  });

  it('ignores markup in comments, scripts and styles, and reads quoted > as text', () => {
    const html = `<!-- <a href="/commented"> --><script>var a = '<a href="/script">';</script>
<style>a[href="/style"] {}</style><textarea><a href="/text"></textarea>
<a title="a > b" href="/real">x</a><a href=/unquoted>y</a><a href = '/single'>z</a>`;

    expect(findUnprefixedLinks(html, '/sub').map((link) => link.value)).toEqual([
      '/real',
      '/unquoted',
      '/single',
    ]);
  });

  it('uses the first attribute of a name, like browsers, and trims it', () => {
    expect(findUnprefixedLinks('<a href=" /a " href="/b">x</a>', '/sub')).toEqual([
      { attribute: 'href', value: '/a' },
    ]);
  });

  it('lists each link once', () => {
    expect(findUnprefixedLinks('<a href="/a">1</a><a href="/a">2</a>', '/sub')).toHaveLength(1);
  });
});

describe('BasePathLinkReport', () => {
  const warn = () => {
    const warning = vi.fn();
    return { warning };
  };

  it('does nothing without a base path', () => {
    const report = new BasePathLinkReport('');
    const logger = warn();

    report.add('/', '<a href="/about">About</a>');
    report.report(logger);

    expect(logger.warning).not.toHaveBeenCalled();
  });

  it('warns once per link, naming the attribute and the first page', () => {
    const report = new BasePathLinkReport('/sub');
    const logger = warn();

    report.add('/', '<a href="/about">About</a><img src="/logo.png" alt="">');
    report.add('/blog', '<a href="/about">About</a>');
    report.add('/blog/post', '<a href="/about">About</a>');
    report.add('/ok', '<a href="/sub/about">About</a>');
    report.report(logger);

    expect(logger.warning.mock.calls.map(([message]) => message)).toEqual([
      '/ and 2 more page(s): href="/about" does not start with the base path /sub, so it breaks when the site is served from there. Use stati.url("/about").',
      '/: src="/logo.png" does not start with the base path /sub, so it breaks when the site is served from there. Use stati.url("/logo.png").',
    ]);
  });

  it('lists the first links and counts the rest', () => {
    const report = new BasePathLinkReport('/sub');
    const logger = warn();

    report.add('/', Array.from({ length: 13 }, (_, i) => `<a href="/p${i}">${i}</a>`).join(''));
    report.report(logger);

    expect(logger.warning).toHaveBeenCalledTimes(11);
    expect(logger.warning).toHaveBeenLastCalledWith(
      '3 more link(s) do not start with the base path /sub.',
    );
  });

  it('is quiet when every link has the base path', () => {
    const report = new BasePathLinkReport('/sub');
    const logger = warn();

    report.add('/', '<a href="/sub/about">About</a>');
    report.report(logger);

    expect(logger.warning).not.toHaveBeenCalled();
  });
});
