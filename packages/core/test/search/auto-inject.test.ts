/**
 * Search auto-inject tests.
 * @module search/auto-inject.test
 */

import { describe, it, expect } from 'vitest';
import { autoInjectSearchMeta } from '../../src/search/auto-inject.js';
import { SEARCH_INDEX_META_NAME } from '../../src/search/constants.js';

describe('autoInjectSearchMeta', () => {
  const searchIndexPath = '/search-index-abc123.json';

  it('injects meta tag before </head>', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = autoInjectSearchMeta(html, searchIndexPath);

    expect(result).toContain(
      `<meta name="${SEARCH_INDEX_META_NAME}" content="${searchIndexPath}">`,
    );
    expect(result).toContain('</head>');
  });

  it('does not inject duplicate meta tag with same attribute order', () => {
    const html = `<html><head><meta name="${SEARCH_INDEX_META_NAME}" content="/existing.json"></head><body></body></html>`;
    const result = autoInjectSearchMeta(html, searchIndexPath);

    // Should not add another meta tag
    const matches = result.match(new RegExp(SEARCH_INDEX_META_NAME, 'g'));
    expect(matches).toHaveLength(1);
  });

  it('does not inject duplicate meta tag with different attribute order', () => {
    // Meta tag with content before name (different order)
    const html = `<html><head><meta content="/existing.json" name="${SEARCH_INDEX_META_NAME}"></head><body></body></html>`;
    const result = autoInjectSearchMeta(html, searchIndexPath);

    // Should not add another meta tag
    const matches = result.match(new RegExp(SEARCH_INDEX_META_NAME, 'g'));
    expect(matches).toHaveLength(1);
  });

  it('handles meta tag with single quotes', () => {
    const html = `<html><head><meta name='${SEARCH_INDEX_META_NAME}' content='/existing.json'></head><body></body></html>`;
    const result = autoInjectSearchMeta(html, searchIndexPath);

    // Should not add another meta tag
    const matches = result.match(new RegExp(SEARCH_INDEX_META_NAME, 'g'));
    expect(matches).toHaveLength(1);
  });

  it('handles meta tag with extra attributes', () => {
    const html = `<html><head><meta id="search" name="${SEARCH_INDEX_META_NAME}" content="/existing.json" data-test="true"></head><body></body></html>`;
    const result = autoInjectSearchMeta(html, searchIndexPath);

    // Should not add another meta tag
    const matches = result.match(new RegExp(SEARCH_INDEX_META_NAME, 'g'));
    expect(matches).toHaveLength(1);
  });

  it('returns original HTML if no </head> tag found', () => {
    const html = '<html><body>No head tag</body></html>';
    const result = autoInjectSearchMeta(html, searchIndexPath);

    expect(result).toBe(html);
  });

  it('handles case-insensitive </head> tag', () => {
    const html = '<html><HEAD><title>Test</title></HEAD><body></body></html>';
    const result = autoInjectSearchMeta(html, searchIndexPath);

    expect(result).toContain(
      `<meta name="${SEARCH_INDEX_META_NAME}" content="${searchIndexPath}">`,
    );
  });
});
