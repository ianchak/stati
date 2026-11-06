import { describe, it, expect } from 'vitest';
import {
  findBodyClosePosition,
  findHeadClosePosition,
  findHtmlTags,
  getAttribute,
  injectBeforeHeadClose,
} from '../../src/core/utils/html.utils.js';

describe('findHeadClosePosition', () => {
  it('finds the closing head tag, in any case', () => {
    const html = '<html><head><title>T</title></HEAD><body></body></html>';
    expect(findHeadClosePosition(html)).toBe(html.indexOf('</HEAD>'));
  });

  it('skips a </head> in a comment, a script, a style, a template or the title', () => {
    const head =
      '<!-- tags go before </head> --><script>var s = "</head>";</script>' +
      '<style>/* </head> */</style><template></head></template><title>a </head> b</title>';
    const html = `<html><head>${head}</head><body></body></html>`;
    expect(findHeadClosePosition(html)).toBe(html.lastIndexOf('</head>'));
  });

  it('ignores a </head> after the body starts', () => {
    expect(findHeadClosePosition('<!doctype html><body><p></head></p></body>')).toBe(-1);
    expect(findHeadClosePosition('<p>Text</p></body></head>')).toBe(-1);
  });

  it('reads a < without a tag name as text', () => {
    const html = '<head><script>if (a < b) {}</script><!-- 1 < 2 --></head><p>1 < 2</p>';
    expect(findHeadClosePosition(`x < y ${html}`)).toBe(`x < y ${html}`.indexOf('</head>'));
  });

  it('ignores a <body> tag in a comment in the head', () => {
    const html = '<head><!-- <body> --></head><body></body>';
    expect(findHeadClosePosition(html)).toBe(html.indexOf('</head>'));
  });

  it('finds a head without a start tag', () => {
    const html = '<!doctype html><title>T</title></head><body></body>';
    expect(findHeadClosePosition(html)).toBe(html.indexOf('</head>'));
  });

  it('returns -1 without a closing head tag, or with one only in a comment', () => {
    expect(findHeadClosePosition('<p>Fragment</p>')).toBe(-1);
    expect(findHeadClosePosition('<head><!-- </head> -->')).toBe(-1);
  });
});

describe('findBodyClosePosition', () => {
  it('finds the last closing body tag that is markup', () => {
    const html =
      '<body><p>Raw </body> in content</p><script>"</body>"</script></Body><!-- </body> -->';
    expect(findBodyClosePosition(html)).toBe(html.indexOf('</Body>'));
  });

  it('returns -1 without a closing body tag, or with one only in a comment or a script', () => {
    expect(findBodyClosePosition('<p>Fragment</p>')).toBe(-1);
    expect(findBodyClosePosition('<body><!-- </body> --><script>"</body>"</script>')).toBe(-1);
  });
});

describe('injectBeforeHeadClose', () => {
  it('injects before the real </head>, not one in a comment', () => {
    const html = '<head><!-- </head> --></head><body></body>';
    expect(injectBeforeHeadClose(html, '<meta x>', '')).toBe(
      '<head><!-- </head> --><meta x>\n</head><body></body>',
    );
  });

  it('returns the HTML unchanged when the head has no closing tag', () => {
    const html = '<body><p></head></p></body>';
    expect(injectBeforeHeadClose(html, '<meta x>')).toBe(html);
  });
});

describe('findHtmlTags', () => {
  it('finds only opening tags by default', () => {
    const tags = findHtmlTags('<head><title>T</title></head>', new Set(['head']));
    expect(tags).toEqual([{ name: 'head', start: 0, end: 6, attributes: [], closing: false }]);
  });

  it('finds closing tags too with closing: true, without attributes', () => {
    const html = '<head lang="en"></head>';
    const tags = findHtmlTags(html, new Set(['head']), { closing: true });
    expect(tags.map(({ name, start, closing }) => ({ name, start, closing }))).toEqual([
      { name: 'head', start: 0, closing: false },
      { name: 'head', start: 16, closing: true },
    ]);
    expect(getAttribute(tags[0]!.attributes, 'lang')?.value).toBe('en');
    expect(tags[1]!.attributes).toEqual([]);
  });
});
