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
import {
  escapeHtml,
  generateRobotsContent,
  parseRobotsDirectives,
  resolveAbsoluteUrl,
} from './utils/index.js';
import { urlMatchesAnyPattern } from '../rss/utils/index.js';
import { describeDateValue, isNotFoundPage, parseDateValue } from '../core/utils/index.js';
import type { Logger } from '../types/logging.js';

/**
 * Maximum entries per sitemap file (per sitemap.org spec)
 */
const MAX_SITEMAP_ENTRIES = 50000;

/**
 * Formats a date for sitemap lastmod field (W3C Datetime / ISO 8601)
 * @param date - Date to format
 * @returns ISO 8601 formatted date string (YYYY-MM-DD)
 */
function formatSitemapDate(date: Date): string {
  const parts = date.toISOString().split('T');
  if (parts[0]) {
    return parts[0];
  }
  return date.toISOString().substring(0, 10);
}

/**
 * Resolves the page's sitemap last-modified date, in priority order:
 * `sitemap.lastmod`, then `updated`, then `date`.
 *
 * Every value is checked with {@link parseDateValue} before it reaches
 * `toISOString()`, so an invalid value (such as `updated: soon`) does not
 * throw. An invalid value is skipped with a warning that names the page and
 * the field, and the search continues to the next source, mirroring how
 * `getFrontMatterDate` treats a bad date so one typo does not hide a valid
 * fallback.
 *
 * @param page - Page to resolve a date for
 * @param logger - Logger used to report invalid values
 * @returns A `Date` to use for `<lastmod>`, or `undefined` when none is valid
 */
function resolveLastmodDate(page: PageModel, logger?: Logger): Date | undefined {
  const sources: Array<[string, unknown]> = [
    ['sitemap.lastmod', page.frontMatter.sitemap?.lastmod],
    ['updated', page.frontMatter.updated],
    ['date', page.frontMatter.date],
  ];

  for (const [field, value] of sources) {
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      continue;
    }
    const date = parseDateValue(value);
    if (date) {
      return date;
    }
    logger?.warning(
      `Sitemap lastmod for ${page.url}: ignoring invalid ${field} value ${describeDateValue(value)}`,
    );
  }

  return undefined;
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
 * Validates change frequency value
 * @param changefreq - Change frequency to validate
 * @returns Valid change frequency or undefined
 */
function validateChangeFreq(changefreq?: string): ChangeFrequency | undefined {
  const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
  if (changefreq && validFreqs.includes(changefreq)) {
    return changefreq as ChangeFrequency;
  }
  return undefined;
}

/**
 * Checks if a page matches exclude patterns
 * @param page - Page to check
 * @param patterns - Exclude patterns (glob or regex)
 * @returns true if page should be excluded
 */
function matchesExcludePattern(page: PageModel, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }
  return urlMatchesAnyPattern(page.url, patterns);
}

/**
 * Checks if a page matches include patterns
 * @param page - Page to check
 * @param patterns - Include patterns (glob or regex)
 * @returns true if page should be included
 */
function matchesIncludePattern(page: PageModel, patterns?: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return true; // Include all by default
  }
  return urlMatchesAnyPattern(page.url, patterns);
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
 * Determines priority for a page based on priority rules
 * @param page - Page to evaluate
 * @param rules - Priority rules from config
 * @param defaultPriority - Default priority value
 * @returns Calculated priority
 */
function determinePriority(
  page: PageModel,
  rules?: Array<{ pattern: string; priority: number }>,
  defaultPriority = 0.5,
): number {
  if (!rules || rules.length === 0) {
    return defaultPriority;
  }

  // Check each rule in order (first match wins)
  for (const rule of rules) {
    const pattern = rule.pattern;
    if (urlMatchesAnyPattern(page.url, [pattern])) {
      return validatePriority(rule.priority);
    }
  }

  return defaultPriority;
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
 * @param logger - Logger for warnings when a date field is invalid
 * @returns Sitemap entry or null if page should be excluded
 */
export function generateSitemapEntry(
  page: PageModel,
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
  logger?: Logger,
): SitemapEntry | null {
  // Check frontmatter exclude flag
  const frontMatterExclude = page.frontMatter.sitemap?.exclude;
  if (frontMatterExclude === true) {
    return null;
  }

  // Leave out the 404 page and noindex pages unless front matter keeps them in
  if (frontMatterExclude !== false && (isNotFoundPage(page) || isNoindexPage(page))) {
    return null;
  }

  // Check exclude patterns
  if (matchesExcludePattern(page, sitemapConfig.excludePatterns)) {
    return null;
  }

  // Check include patterns
  if (!matchesIncludePattern(page, sitemapConfig.includePatterns)) {
    return null;
  }

  // Apply filter function if provided
  if (sitemapConfig.filter && !sitemapConfig.filter(page)) {
    return null;
  }

  const siteUrl = config.site.baseUrl;

  // Determine lastmod. Each source is checked before it reaches toISOString(),
  // so an invalid date (such as `updated: soon`) is skipped with a warning
  // that names the page and the field, instead of failing the whole build.
  let lastmod: string | undefined;
  const lastmodDate = resolveLastmodDate(page, logger);
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
    priority = determinePriority(page, sitemapConfig.priorityRules, sitemapConfig.defaultPriority);
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
  xml += `    <loc>${escapeHtml(entry.url)}</loc>\n`;

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
    xml += `    <loc>${escapeHtml(absoluteUrl)}</loc>\n`;
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
 * @param logger - Logger for warnings when a date field is invalid
 * @returns Sitemap generation result with XML content
 */
export function generateSitemap(
  pages: PageModel[],
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
  logger?: Logger,
): SitemapGenerationResult {
  // Generate entries for all pages
  const entries: SitemapEntry[] = [];
  for (const page of pages) {
    const entry = generateSitemapEntry(page, config, sitemapConfig, logger);
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
