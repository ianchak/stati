/**
 * Sitemap generation utilities for Stati
 * @module seo/sitemap
 */

import type {
  SitemapEntry,
  SitemapConfig,
  ChangeFrequency,
  SitemapGenerationResult,
} from '../types/sitemap.js';
import type { PageModel } from '../types/content.js';
import type { StatiConfig } from '../types/config.js';
import { generateRobotsContent, parseRobotsDirectives } from './utils/index.js';
import {
  compileUrlPatterns,
  describeDateValue,
  escapeHtml,
  getPageModifiedDate,
  isNotFoundPage,
  percentEncodeUrl,
  resolveAbsoluteUrl,
  type UrlPatternMatcher,
} from '../core/utils/index.js';
import type { Logger } from '../types/logging.js';

/**
 * Maximum entries per sitemap file (per sitemap.org spec)
 */
const MAX_SITEMAP_ENTRIES = 50000;

/**
 * Formats a date for sitemap lastmod field (W3C Datetime / ISO 8601).
 *
 * A date without a time, which parses to midnight UTC, is written as `YYYY-MM-DD`. Any other
 * value is written as a UTC date-time, so `2024-03-04T23:30:00-05:00` stays the same moment
 * (`2024-03-05T04:30:00Z`) instead of being cut to a UTC date the author never wrote.
 *
 * @param date - Date to format
 * @returns `YYYY-MM-DD`, or `YYYY-MM-DDThh:mm:ssZ` with fractional seconds when there are any
 */
function formatSitemapDate(date: Date): string {
  const iso = date.toISOString();
  if (iso.endsWith('T00:00:00.000Z')) {
    return iso.slice(0, 10);
  }
  return iso.replace('.000Z', 'Z');
}

/**
 * Validates and clamps priority value to 0.0-1.0 range
 * @param priority - Priority value to validate
 * @returns Clamped priority value
 */
function validatePriority(priority: number): number {
  if (isNaN(priority)) {
    return 0.5;
  }
  return Math.max(0.0, Math.min(1.0, priority));
}

/**
 * The values `<changefreq>` accepts
 */
export const CHANGE_FREQUENCIES: readonly ChangeFrequency[] = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
];

/**
 * Validates change frequency value, in any letter case and without surrounding spaces
 * (`' Weekly'` is `weekly`)
 * @param changefreq - Change frequency to validate
 * @returns Valid change frequency or undefined
 */
function validateChangeFreq(changefreq: unknown): ChangeFrequency | undefined {
  if (typeof changefreq !== 'string') {
    return undefined;
  }
  const value = changefreq.trim().toLowerCase();
  return CHANGE_FREQUENCIES.find((freq) => freq === value);
}

/**
 * The sitemap's URL patterns, compiled once per sitemap. They match by prefix: a pattern
 * without `*` or `?` also matches the URLs below it, so `/blog` matches `/blog/post`.
 */
interface SitemapPatterns {
  /** Whether `excludePatterns` leaves the URL out */
  isExcluded: UrlPatternMatcher;
  /** Whether `includePatterns` keeps the URL in; every URL is in without include patterns */
  isIncluded: UrlPatternMatcher;
  /** The `priorityRules`, in order */
  priorityRules: Array<{ matches: UrlPatternMatcher; priority: number }>;
}

/**
 * Compiles the sitemap's URL patterns.
 * @param sitemapConfig - Sitemap configuration
 * @param logger - Receives a warning for each pattern that is not a valid glob
 * @returns The compiled patterns
 */
function compileSitemapPatterns(sitemapConfig: SitemapConfig, logger?: Logger): SitemapPatterns {
  const { excludePatterns, includePatterns, priorityRules = [] } = sitemapConfig;
  return {
    isExcluded: compileUrlPatterns(excludePatterns, {
      prefix: true,
      option: 'sitemap.excludePatterns',
      logger,
    }),
    isIncluded:
      includePatterns && includePatterns.length > 0
        ? compileUrlPatterns(includePatterns, {
            prefix: true,
            option: 'sitemap.includePatterns',
            logger,
          })
        : () => true,
    priorityRules: priorityRules.map((rule) => ({
      matches: compileUrlPatterns([rule.pattern], {
        prefix: true,
        option: 'sitemap.priorityRules',
        logger,
      }),
      priority: rule.priority,
    })),
  };
}

/**
 * Whether the page's robots meta tag tells search engines not to index it: `seo.noindex`,
 * `seo.robots.index: false`, or a `seo.robots` string with a `noindex` or `none` directive.
 * @param page - Page to check
 * @returns true if the page is marked noindex
 */
function isNoindexPage(page: PageModel): boolean {
  const seo = page.frontMatter.seo;
  if (!seo || typeof seo !== 'object') {
    return false;
  }
  return parseRobotsDirectives(generateRobotsContent(seo)).some(
    (directive) => directive === 'noindex' || directive === 'none',
  );
}

/**
 * Whether the page's own state keeps it out of every sitemap: `sitemap.exclude: true` in front
 * matter, or the 404 page or a noindex page unless `sitemap.exclude: false` keeps it in.
 * @param page - Page to check
 * @returns true if the page is left out
 */
export function isLeftOutBySitemapRules(page: PageModel): boolean {
  const frontMatterExclude = page.frontMatter.sitemap?.exclude;
  if (frontMatterExclude === true) {
    return true;
  }
  return frontMatterExclude !== false && (isNotFoundPage(page) || isNoindexPage(page));
}

/**
 * Determines priority for a page based on priority rules
 * @param page - Page to evaluate
 * @param rules - Compiled priority rules from config
 * @param defaultPriority - Default priority value
 * @returns Calculated priority
 */
function determinePriority(
  page: PageModel,
  rules: SitemapPatterns['priorityRules'],
  defaultPriority = 0.5,
): number {
  // Check each rule in order (first match wins)
  const rule = rules.find(({ matches }) => matches(page.url));
  return rule ? validatePriority(rule.priority) : defaultPriority;
}

/**
 * Generates a sitemap entry from a page model.
 *
 * The site's 404 page and pages marked noindex are left out, as search engines report a
 * sitemap URL marked noindex as an error. A page that sets `sitemap.exclude: false` in front
 * matter stays in despite both; the exclude and include patterns and `filter` still apply.
 *
 * @param page - Page to generate entry for
 * @param config - Stati configuration
 * @param sitemapConfig - Sitemap configuration
 * @param logger - Logger for warnings when a date field or a pattern is invalid
 * @returns Sitemap entry or null if page should be excluded
 */
export function generateSitemapEntry(
  page: PageModel,
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
  logger?: Logger,
): SitemapEntry | null {
  return createSitemapEntry(
    page,
    config,
    sitemapConfig,
    compileSitemapPatterns(sitemapConfig, logger),
    logger,
  );
}

/**
 * {@link generateSitemapEntry} with the sitemap's patterns already compiled.
 */
function createSitemapEntry(
  page: PageModel,
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
  patterns: SitemapPatterns,
  logger?: Logger,
): SitemapEntry | null {
  if (isLeftOutBySitemapRules(page)) {
    return null;
  }

  // Check exclude patterns
  if (patterns.isExcluded(page.url)) {
    return null;
  }

  // Check include patterns
  if (!patterns.isIncluded(page.url)) {
    return null;
  }

  // Apply filter function if provided
  if (sitemapConfig.filter && !sitemapConfig.filter(page)) {
    return null;
  }

  const siteUrl = config.site.baseUrl;

  // Determine lastmod: sitemap.lastmod, then updated, then the publish date. Each source is
  // checked before it reaches toISOString(), so an invalid date (such as `updated: soon`) is
  // skipped with a warning that names the page and the field, instead of failing the build.
  let lastmod: string | undefined;
  const lastmodDate = getPageModifiedDate(page, (field, value) => {
    logger?.warning(
      `Sitemap lastmod for ${page.url}: ignoring invalid ${field} value ${describeDateValue(value)}`,
    );
  });
  if (lastmodDate) {
    lastmod = formatSitemapDate(lastmodDate);
  }

  // Determine changefreq
  let changefreq: ChangeFrequency | undefined;
  if (page.frontMatter.sitemap?.changefreq) {
    changefreq = validateChangeFreq(page.frontMatter.sitemap.changefreq);
  }
  if (!changefreq && sitemapConfig.defaultChangeFreq) {
    changefreq = sitemapConfig.defaultChangeFreq;
  }

  // Determine priority
  let priority: number | undefined;
  if (page.frontMatter.sitemap?.priority !== undefined) {
    priority = validatePriority(page.frontMatter.sitemap.priority);
  } else {
    priority = determinePriority(page, patterns.priorityRules, sitemapConfig.defaultPriority);
  }

  // Resolve absolute URL
  let url = resolveAbsoluteUrl(page.url, siteUrl);

  // Apply transformUrl if provided
  if (sitemapConfig.transformUrl) {
    url = sitemapConfig.transformUrl(url, page, config);
  }

  // Build entry
  const entry: SitemapEntry = { url };
  if (lastmod !== undefined) {
    entry.lastmod = lastmod;
  }
  if (changefreq !== undefined) {
    entry.changefreq = changefreq;
  }
  if (priority !== undefined) {
    entry.priority = priority;
  }

  // Apply transformEntry if provided
  if (sitemapConfig.transformEntry) {
    return sitemapConfig.transformEntry(entry, page);
  }

  return entry;
}

/**
 * Generates XML for a single sitemap entry
 * @param entry - Sitemap entry
 * @returns XML string for entry
 */
function generateEntryXml(entry: SitemapEntry): string {
  let xml = '  <url>\n';
  xml += `    <loc>${escapeHtml(percentEncodeUrl(entry.url))}</loc>\n`;

  if (entry.lastmod) {
    xml += `    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>\n`;
  }

  if (entry.changefreq) {
    xml += `    <changefreq>${escapeHtml(entry.changefreq)}</changefreq>\n`;
  }

  if (entry.priority !== undefined) {
    xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
  }

  xml += '  </url>\n';
  return xml;
}

/**
 * Generates sitemap XML from entries
 * @param entries - Sitemap entries
 * @returns Complete sitemap XML
 */
export function generateSitemapXml(entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const entry of entries) {
    xml += generateEntryXml(entry);
  }

  xml += '</urlset>\n';
  return xml;
}

/**
 * Generates sitemap index XML for multiple sitemaps
 * @param sitemapUrls - Array of sitemap URLs
 * @param siteUrl - Base site URL
 * @returns Sitemap index XML
 */
export function generateSitemapIndexXml(sitemapUrls: string[], siteUrl: string): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of sitemapUrls) {
    const absoluteUrl = resolveAbsoluteUrl(url, siteUrl);
    xml += '  <sitemap>\n';
    xml += `    <loc>${escapeHtml(percentEncodeUrl(absoluteUrl))}</loc>\n`;
    xml += '  </sitemap>\n';
  }

  xml += '</sitemapindex>\n';
  return xml;
}

/**
 * Splits entries into multiple sitemaps if needed
 * @param entries - All sitemap entries
 * @returns Array of entry arrays (one per sitemap file)
 */
function splitEntriesIntoSitemaps(entries: SitemapEntry[]): SitemapEntry[][] {
  if (entries.length <= MAX_SITEMAP_ENTRIES) {
    return [entries];
  }

  const sitemaps: SitemapEntry[][] = [];
  for (let i = 0; i < entries.length; i += MAX_SITEMAP_ENTRIES) {
    sitemaps.push(entries.slice(i, i + MAX_SITEMAP_ENTRIES));
  }

  return sitemaps;
}

/**
 * Generates sitemap(s) from pages
 * @param pages - All pages to include in sitemap
 * @param config - Stati configuration
 * @param sitemapConfig - Sitemap configuration
 * @param logger - Logger for warnings when a date field or a pattern is invalid
 * @returns Sitemap generation result with XML content
 */
export function generateSitemap(
  pages: PageModel[],
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
  logger?: Logger,
): SitemapGenerationResult {
  // Generate entries for all pages, with the patterns compiled (and reported) once
  const patterns = compileSitemapPatterns(sitemapConfig, logger);
  const entries: SitemapEntry[] = [];
  for (const page of pages) {
    const entry = createSitemapEntry(page, config, sitemapConfig, patterns, logger);
    if (entry) {
      entries.push(entry);
    }
  }

  // Check if we need multiple sitemaps
  const sitemapGroups = splitEntriesIntoSitemaps(entries);

  if (sitemapGroups.length === 1 && sitemapGroups[0]) {
    // Single sitemap
    const xml = generateSitemapXml(sitemapGroups[0]);
    return {
      xml,
      entryCount: entries.length,
      sizeInBytes: Buffer.byteLength(xml, 'utf8'),
    };
  }

  // Multiple sitemaps - generate index
  const sitemapUrls: string[] = [];
  const sitemapFiles: Array<{ filename: string; xml: string }> = [];

  for (let i = 0; i < sitemapGroups.length; i++) {
    const group = sitemapGroups[i];
    if (!group) continue;

    const filename = `sitemap-${i + 1}.xml`;
    const xml = generateSitemapXml(group);
    sitemapUrls.push(`/${filename}`);
    sitemapFiles.push({ filename, xml });
  }

  // Generate index
  const indexXml = generateSitemapIndexXml(sitemapUrls, config.site.baseUrl);

  return {
    xml: indexXml,
    entryCount: entries.length,
    sizeInBytes: Buffer.byteLength(indexXml, 'utf8'),
    sitemaps: sitemapFiles,
  };
}
