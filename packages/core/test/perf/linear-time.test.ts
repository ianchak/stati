/**
 * Linear-time checks for the scanners.
 *
 * Pages, stylesheets and directive lists that never close a comment, string, tag or element must
 * be scanned in linear time. These assert wall-clock limits, which are too noisy for the coverage
 * run in CI, so they live with the perf tests.
 *
 * Run: npx vitest run packages/core/test/perf/linear-time.test.ts
 * @module perf/linear-time.test
 */

import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { inlineLocalImages } from '../../src/images/og.js';
import { parseRobotsDirectives } from '../../src/seo/utils/index.js';
import { rebaseRelativeUrls, rewriteStylesheetLinks } from '../../src/css/stylesheet.js';

describe('rebaseRelativeUrls', () => {
  it('takes linear time on comments and strings that never close', () => {
    const started = performance.now();
    for (const open of ['/*', '"', "'", 'url("', '@import/*', '@import ']) {
      rebaseRelativeUrls(`${open}url(a.png)`.repeat(50_000), '/styles.css');
    }
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('rewriteStylesheetLinks', () => {
  const targets = new Map([
    ['/styles.css', '/_assets/styles-0A1B2C3D.css'],
    ['/blog/local.css', '/_assets/blog/local-DEADBEEF.css'],
  ]);

  it('takes linear time on comments, elements and tags that never close', () => {
    const started = performance.now();
    // The three link functions share one scanner
    for (const open of ['<!--', '<script>', '<title>', '<link ', '<a title="', "<a b='", '<!x']) {
      rewriteStylesheetLinks(
        `${open}<link rel="stylesheet" href="/styles.css">`.repeat(50_000),
        targets,
        '/',
      );
    }
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('parseRobotsDirectives', () => {
  it('takes linear time on long runs of whitespace and colons', () => {
    const started = performance.now();
    const directives = parseRobotsDirectives(`${'\t'.repeat(400_000)}x${' :'.repeat(400_000)}`);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(directives).toEqual([`x${':'.repeat(400_000)}`]);
  });
});

describe('inlineLocalImages', () => {
  it('takes linear time on <img tags that never close', async () => {
    // No tag closes, so nothing is read from these directories
    const dirs = { staticDir: '/public', srcDir: '/site', baseDir: '/site/blog' };
    const started = performance.now();
    await inlineLocalImages('<img '.repeat(50_000), dirs);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
