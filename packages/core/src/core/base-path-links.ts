/**
 * Finds links in built pages that miss the base path of a site served from a subfolder.
 * @module core/base-path-links
 */

import { findHtmlTags } from '../css/stylesheet.js';
import type { Logger } from '../types/index.js';
import { withBasePath } from './utils/base-path.utils.js';

/** Tags whose `href` or `src` the browser requests or follows */
const LINKING_TAGS = new Set([
  'a',
  'area',
  'audio',
  'embed',
  'iframe',
  'image',
  'img',
  'link',
  'script',
  'source',
  'track',
  'use',
  'video',
]);

/** The most links one warning lists; the rest are counted */
const MAX_LISTED_LINKS = 10;

/**
 * An `href` or `src` that starts with `/` but not with the base path.
 */
export interface UnprefixedLink {
  /** The attribute, `href` or `src` */
  attribute: 'href' | 'src';
  /** The value as written, such as '/about' */
  value: string;
}

/**
 * The `href` and `src` values of a page that start with `/` but not with the base path, in
 * order and without repeats. Relative, absolute, protocol-relative, `#hash` and `?query`
 * values are fine.
 *
 * @param html - The page's HTML
 * @param basePath - The base path from `getBasePath()`
 */
export function findUnprefixedLinks(html: string, basePath: string): UnprefixedLink[] {
  const found = new Map<string, UnprefixedLink>();
  for (const { attributes } of findHtmlTags(html, LINKING_TAGS)) {
    for (const attribute of ['href', 'src'] as const) {
      // Browsers use the first attribute of a name
      const value = attributes.find(({ name }) => name === attribute)?.value.trim();
      if (value?.startsWith('/') && withBasePath(value, basePath) !== value) {
        found.set(`${attribute}=${value}`, { attribute, value });
      }
    }
  }
  return [...found.values()];
}

/**
 * Collects the links that miss the base path while a build renders pages, and reports them
 * once at the end: one warning per link, naming the attribute and the first page that has it,
 * so a template that skips `stati.url()` shows up in the build log, not as a 404 in production.
 */
export class BasePathLinkReport {
  private readonly links = new Map<string, { link: UnprefixedLink; pages: string[] }>();

  constructor(private readonly basePath: string) {}

  /**
   * Checks a rendered page. Does nothing without a base path.
   *
   * @param pageUrl - The page's URL
   * @param html - The page's final HTML
   */
  add(pageUrl: string, html: string): void {
    if (this.basePath === '') {
      return;
    }
    for (const link of findUnprefixedLinks(html, this.basePath)) {
      const key = `${link.attribute}=${link.value}`;
      const entry = this.links.get(key);
      if (entry) {
        entry.pages.push(pageUrl);
      } else {
        this.links.set(key, { link, pages: [pageUrl] });
      }
    }
  }

  /**
   * Logs a warning for each link found.
   */
  report(logger: Pick<Logger, 'warning'>): void {
    const entries = [...this.links.values()];
    for (const { link, pages } of entries.slice(0, MAX_LISTED_LINKS)) {
      const others = pages.length > 1 ? ` and ${pages.length - 1} more page(s)` : '';
      logger.warning(
        `${pages[0]}${others}: ${link.attribute}="${link.value}" does not start with the base path ${this.basePath}, so it breaks when the site is served from there. Use stati.url(${JSON.stringify(link.value)}).`,
      );
    }
    if (entries.length > MAX_LISTED_LINKS) {
      logger.warning(
        `${entries.length - MAX_LISTED_LINKS} more link(s) do not start with the base path ${this.basePath}.`,
      );
    }
  }
}
