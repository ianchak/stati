/**
 * Stylesheet scanner timing checks.
 *
 * Pages and stylesheets that never close a comment, string, tag or element must be scanned in
 * linear time. These assert wall-clock limits, which are too noisy for the coverage run in CI,
 * so they live with the perf tests.
 *
 * Run: npx vitest run packages/core/test/perf/stylesheet-scan.test.ts
 * @module perf/stylesheet-scan.test
 */

import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
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
