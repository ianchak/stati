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
import { escapeHtml, resolveAbsoluteUrl } from './utils/index.js';
import { urlMatchesAnyPattern } from '../rss/utils/index.js';

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
 * Generates a sitemap entry from a page model
 * @param page - Page to generate entry for
 * @param config - Stati configuration
 * @param sitemapConfig - Sitemap configuration
 * @returns Sitemap entry or null if page should be excluded
 */
export function generateSitemapEntry(
  page: PageModel,
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
): SitemapEntry | null {
  // Check frontmatter exclude flag
  if (page.frontMatter.sitemap?.exclude === true) {
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

  // Determine lastmod
  let lastmod: string | undefined;
  if (page.frontMatter.sitemap?.lastmod) {
    lastmod = formatSitemapDate(new Date(page.frontMatter.sitemap.lastmod));
  } else if (page.frontMatter.updated) {
    lastmod = formatSitemapDate(new Date(page.frontMatter.updated));
  } else if (page.frontMatter.date) {
    lastmod = formatSitemapDate(new Date(page.frontMatter.date));
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
 * @returns Sitemap generation result with XML content
 */
export function generateSitemap(
  pages: PageModel[],
  config: StatiConfig,
  sitemapConfig: SitemapConfig,
): SitemapGenerationResult {
  // Generate entries for all pages
  const entries: SitemapEntry[] = [];
  for (const page of pages) {
    const entry = generateSitemapEntry(page, config, sitemapConfig);
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
