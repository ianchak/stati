/**
 * Google News sitemap generation for Stati
 * @module seo/news-sitemap
 */

import type { NewsSitemapConfig, NewsSitemapGenerationResult } from '../types/sitemap.js';
import type { PageModel } from '../types/content.js';
import type { StatiConfig } from '../types/config.js';
import type { Logger } from '../types/logging.js';
import { ConfigValidationError } from '../config/errors.js';
import {
  compileUrlPatterns,
  escapeHtml,
  isVirtualPage,
  percentEncodeUrl,
  resolveAbsoluteUrl,
} from '../core/utils/index.js';
import { CHANGE_FREQUENCIES, isLeftOutBySitemapRules } from './sitemap.js';

/** The XML namespace of Google News sitemap elements */
const NEWS_NAMESPACE = 'http://www.google.com/schemas/sitemap-news/0.9';

/** Google reads at most this many articles from one news sitemap */
const MAX_NEWS_ENTRIES = 1000;

/** Google News reads the articles of the last two days */
const DEFAULT_MAX_AGE_DAYS = 2;

/** The file name used when `sitemap.news.filename` is not set */
export const DEFAULT_NEWS_SITEMAP_FILENAME = 'news-sitemap.xml';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Characters XML 1.0 does not allow in text, which a copy-pasted title can hold */
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

/** The file names of the main sitemap, which the news sitemap must not overwrite */
const MAIN_SITEMAP_FILENAME = /^sitemap(-\d+)?\.xml$/i;

/** The language codes Google accepts: ISO 639, or one of the two Chinese variants */
const NEWS_LANGUAGE = /^([a-z]{2,3}|zh-(cn|tw))$/i;

/**
 * File name of the news sitemap in the output folder.
 * @param news - The `sitemap.news` configuration
 * @returns `news.filename`, or `news-sitemap.xml`
 */
export function resolveNewsSitemapFilename(news: NewsSitemapConfig): string {
  return news.filename ?? DEFAULT_NEWS_SITEMAP_FILENAME;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Validates `sitemap.defaultPriority`, `sitemap.defaultChangeFreq` and `sitemap.news`. Other
 * `sitemap` options are not checked.
 *
 * @param sitemap - The `sitemap` value from the config
 * @throws {ConfigValidationError} When `defaultPriority` is not a number from 0.0 to 1.0,
 *   `defaultChangeFreq` is not a `<changefreq>` value, or `sitemap.news` is not an object with
 *   the options below or one of them has the wrong type or value
 */
export function validateSitemapConfig(sitemap: unknown): void {
  if (!isPlainObject(sitemap)) {
    return;
  }

  const defaultPriority = sitemap.defaultPriority;
  if (
    defaultPriority !== undefined &&
    (typeof defaultPriority !== 'number' ||
      !Number.isFinite(defaultPriority) ||
      defaultPriority < 0 ||
      defaultPriority > 1)
  ) {
    throw new ConfigValidationError(
      `sitemap.defaultPriority must be a number from 0.0 to 1.0 (got ${describe(defaultPriority)}).`,
    );
  }

  const defaultChangeFreq = sitemap.defaultChangeFreq;
  if (
    defaultChangeFreq !== undefined &&
    !CHANGE_FREQUENCIES.some((freq) => freq === defaultChangeFreq)
  ) {
    throw new ConfigValidationError(
      `sitemap.defaultChangeFreq must be one of ${CHANGE_FREQUENCIES.join(', ')} (got ${describe(defaultChangeFreq)}).`,
    );
  }

  if (sitemap.news === undefined) {
    return;
  }
  const news = sitemap.news;
  if (!isPlainObject(news)) {
    throw new ConfigValidationError(
      `sitemap.news must be an object such as { include: ['/news/*/*'] } (got ${describe(news)}).`,
    );
  }

  const allowed = ['include', 'publicationName', 'language', 'maxAgeDays', 'filename'];
  for (const key of Object.keys(news)) {
    if (!allowed.includes(key)) {
      throw new ConfigValidationError(
        `Unknown option sitemap.news.${key}. Allowed options: ${allowed.join(', ')}.`,
      );
    }
  }

  const include = news.include;
  if (!Array.isArray(include) || !include.every((item) => typeof item === 'string')) {
    throw new ConfigValidationError(
      `sitemap.news.include must be an array of URL glob patterns, such as ['/news/*/*'] (got ${describe(include)}).`,
    );
  }

  for (const key of ['publicationName', 'language'] as const) {
    const value = news[key];
    if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
      throw new ConfigValidationError(
        `sitemap.news.${key} must be a non-empty string (got ${describe(value)}).`,
      );
    }
  }

  if (news.language !== undefined && !NEWS_LANGUAGE.test((news.language as string).trim())) {
    throw new ConfigValidationError(
      `sitemap.news.language must be an ISO 639 language code such as 'en' or 'de' ('zh-cn' and 'zh-tw' for Chinese), not a locale (got ${describe(news.language)}).`,
    );
  }

  const maxAgeDays = news.maxAgeDays;
  if (
    maxAgeDays !== undefined &&
    (typeof maxAgeDays !== 'number' || !Number.isFinite(maxAgeDays) || maxAgeDays <= 0)
  ) {
    throw new ConfigValidationError(
      `sitemap.news.maxAgeDays must be a number of days greater than 0 (got ${describe(maxAgeDays)}).`,
    );
  }

  const filename = news.filename;
  if (filename !== undefined) {
    if (typeof filename !== 'string' || !/^[\w.-]+\.xml$/i.test(filename)) {
      throw new ConfigValidationError(
        `sitemap.news.filename must be an XML file name of letters, digits, '.', '_' and '-', without a folder, such as 'news-sitemap.xml' (got ${describe(filename)}).`,
      );
    }
    if (MAIN_SITEMAP_FILENAME.test(filename)) {
      throw new ConfigValidationError(
        `sitemap.news.filename '${filename}' is used by the main sitemap. Use another name, such as 'news-sitemap.xml'.`,
      );
    }
  }
}

/**
 * The publication language for `<news:language>`: an ISO 639 code, two letters except for the
 * Chinese variants Google lists (`zh-cn` and `zh-tw`).
 *
 * @param locale - A BCP 47 tag such as `en-US` or `pt_BR`
 * @returns The code, or `en` when there is no locale
 */
function languageOfLocale(locale: string | undefined): string {
  const [primary, ...rest] = (locale ?? '').toLowerCase().split(/[-_]/);
  if (!primary) {
    return 'en';
  }
  if (primary === 'zh') {
    return rest.some((part) => ['tw', 'hk', 'mo', 'hant'].includes(part)) ? 'zh-tw' : 'zh-cn';
  }
  return primary;
}

/** Escapes text for an XML element, dropping the characters XML cannot hold */
function escapeXml(text: string): string {
  return escapeHtml(text.replace(INVALID_XML_CHARS, ''));
}

/** One article of the news sitemap */
interface NewsEntry {
  url: string;
  title: string;
  publishedAt: Date;
}

/**
 * Generates Google News sitemap XML from entries.
 *
 * @param entries - Articles, already in the order to write them
 * @param publication - Publication name and language for every article
 * @returns A complete `urlset` with the `news:` namespace
 */
export function generateNewsSitemapXml(
  entries: ReadonlyArray<{ url: string; title: string; publishedAt: Date }>,
  publication: { name: string; language: string },
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="${NEWS_NAMESPACE}">\n`;

  for (const entry of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(percentEncodeUrl(entry.url))}</loc>\n`;
    xml += '    <news:news>\n';
    xml += '      <news:publication>\n';
    xml += `        <news:name>${escapeXml(publication.name)}</news:name>\n`;
    xml += `        <news:language>${escapeXml(publication.language)}</news:language>\n`;
    xml += '      </news:publication>\n';
    xml += `      <news:publication_date>${entry.publishedAt.toISOString()}</news:publication_date>\n`;
    xml += `      <news:title>${escapeXml(entry.title)}</news:title>\n`;
    xml += '    </news:news>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';
  return xml;
}

/**
 * Generates the Google News sitemap: the pages that match `news.include` and were published
 * within `news.maxAgeDays`, newest first, at most 1000.
 *
 * Drafts, generated pages, later pages of a paginated listing, the 404 page and noindex pages
 * (unless `sitemap.exclude: false` keeps them in) are left out, and so is a page that is
 * missing a valid `publishedAt` or a title, with a warning. Nothing to list still gives a valid
 * `urlset`, with no `url` elements.
 *
 * @param pages - All pages of the site
 * @param config - Stati configuration
 * @param news - The `sitemap.news` configuration
 * @param logger - Logger for warnings about pages Google would reject
 * @param now - The time `maxAgeDays` counts back from (default: now)
 * @returns The XML, the number of articles in it and the file name to write it to
 */
export function generateNewsSitemap(
  pages: PageModel[],
  config: StatiConfig,
  news: NewsSitemapConfig,
  logger?: Logger,
  now: Date = new Date(),
): NewsSitemapGenerationResult {
  const cutoff = now.getTime() - (news.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * DAY_MS;
  const entries: NewsEntry[] = [];
  // Globs that match the whole URL, like seo.articles.include
  const isIncluded = compileUrlPatterns(news.include, { option: 'sitemap.news.include', logger });

  for (const page of pages) {
    if (
      page.frontMatter.draft ||
      isVirtualPage(page) ||
      isLeftOutBySitemapRules(page) ||
      !isIncluded(page.url)
    ) {
      continue;
    }

    const publishedAt = page.publishedAt;
    if (!(publishedAt instanceof Date) || Number.isNaN(publishedAt.getTime())) {
      logger?.warning(
        `News sitemap: leaving out ${page.url}, which has no valid publication date (set publishedAt or date in its front matter).`,
      );
      continue;
    }
    if (publishedAt.getTime() < cutoff) {
      continue;
    }

    const title = typeof page.frontMatter.title === 'string' ? page.frontMatter.title.trim() : '';
    if (!title) {
      logger?.warning(`News sitemap: leaving out ${page.url}, which has no title.`);
      continue;
    }

    entries.push({
      url: resolveAbsoluteUrl(page.url, config.site.baseUrl),
      title,
      publishedAt,
    });
  }

  entries.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime() || (a.url < b.url ? -1 : 1),
  );
  const listed = entries.slice(0, MAX_NEWS_ENTRIES);
  if (entries.length > listed.length) {
    logger?.warning(
      `News sitemap: ${entries.length} articles are recent enough, but a news sitemap holds ${MAX_NEWS_ENTRIES}. The oldest ${entries.length - listed.length} are left out.`,
    );
  }

  const xml = generateNewsSitemapXml(listed, {
    name: news.publicationName?.trim() || config.site.title,
    language: news.language?.trim().toLowerCase() || languageOfLocale(config.site.defaultLocale),
  });

  return {
    xml,
    entryCount: listed.length,
    sizeInBytes: Buffer.byteLength(xml, 'utf8'),
    filename: resolveNewsSitemapFilename(news),
  };
}
