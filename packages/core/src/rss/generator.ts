/**
 * RSS feed generation utilities for Stati
 * @module rss/generator
 */

import type { PageModel } from '../types/content.js';
import type { StatiConfig } from '../types/config.js';
import type { RSSFeedConfig, RSSGenerationResult } from '../types/rss.js';
import type { Logger } from '../types/logging.js';
import { escapeHtml } from '../seo/utils/index.js';
import { filterByPatterns } from './utils/index.js';

/**
 * Formats a date for RSS pubDate field (RFC 822)
 * @param date - Date to format
 * @returns RFC 822 formatted date string
 */
function formatRSSDate(date: Date): string {
  return date.toUTCString();
}

/**
 * Converts a date string or Date object to RFC 822 format
 * @param dateInput - Date string or Date object
 * @returns RFC 822 formatted date string or undefined if invalid
 */
function parseAndFormatDate(dateInput: Date | string | undefined): string | undefined {
  if (!dateInput) return undefined;

  let date: Date;
  if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    return undefined;
  }

  return formatRSSDate(date);
}

/**
 * Filters pages based on feed configuration
 * @param pages - All pages
 * @param feedConfig - Feed configuration
 * @returns Filtered pages
 */
function filterPages(pages: PageModel[], feedConfig: RSSFeedConfig): PageModel[] {
  const options: { includePatterns?: string[]; excludePatterns?: string[] } = {};
  if (feedConfig.contentPatterns) {
    options.includePatterns = feedConfig.contentPatterns;
  }
  if (feedConfig.excludePatterns) {
    options.excludePatterns = feedConfig.excludePatterns;
  }

  let filtered = filterByPatterns(pages, (page) => page.sourcePath, options);

  // Apply custom filter function if provided
  if (feedConfig.filter) {
    filtered = filtered.filter(feedConfig.filter);
  }

  return filtered;
}

/**
 * Helper to get date value from page for sorting
 * @param page - Page to get date from
 * @returns Date value or undefined
 */
function getPageDate(page: PageModel): string | Date | undefined {
  return page.frontMatter.publishedAt || page.frontMatter.date;
}

/**
 * Sorts pages based on feed configuration
 * @param pages - Pages to sort
 * @param feedConfig - Feed configuration
 * @returns Sorted pages
 */
function sortPages(pages: PageModel[], feedConfig: RSSFeedConfig): PageModel[] {
  const sorted = [...pages];
  const sortBy = feedConfig.sortBy || 'date-desc';

  if (sortBy === 'custom' && feedConfig.sortFn) {
    return sorted.sort(feedConfig.sortFn);
  }

  return sorted.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
      case 'date-asc': {
        const dateA = getPageDate(a);
        const dateB = getPageDate(b);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        const comparison = new Date(dateA).getTime() - new Date(dateB).getTime();
        return sortBy === 'date-asc' ? comparison : -comparison;
      }
      case 'title-asc':
      case 'title-desc': {
        const titleA = (a.frontMatter.title || '').toLowerCase();
        const titleB = (b.frontMatter.title || '').toLowerCase();
        const comparison = titleA.localeCompare(titleB);
        return sortBy === 'title-asc' ? comparison : -comparison;
      }
      default:
        return 0;
    }
  });
}

/**
 * Type guard to ensure we have a valid record-like object
 * @param value - Value to check
 * @returns True if value is a non-null object
 */
function isValidRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && value !== undefined && typeof value === 'object';
}

/**
 * Gets a value from page using field mapping with improved type safety
 * @param page - Page to extract value from
 * @param mapping - Field mapping (property name or function)
 * @param defaultProp - Default property name to use
 * @param logger - Logger instance for warnings
 * @returns Extracted value or undefined
 */
function getFieldValue<T>(
  page: PageModel,
  mapping: string | ((page: PageModel) => T) | undefined,
  defaultProp?: string,
  logger?: Logger,
): T | undefined {
  if (typeof mapping === 'function') {
    try {
      return mapping(page);
    } catch (error) {
      // Log error but don't crash - return undefined for invalid mappings
      if (logger) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warning(`Field mapping function failed for page ${page.slug}: ${errorMessage}`);
      }
      return undefined;
    }
  }

  const prop = mapping || defaultProp;
  if (!prop) return undefined;

  // Type-safe access to frontMatter properties using type guard
  // FrontMatter interface allows index signature for custom properties
  if (!isValidRecord(page.frontMatter)) {
    return undefined;
  }

  const value = page.frontMatter[prop];

  // Return value with proper type checking
  return value !== undefined && value !== null ? (value as T) : undefined;
}

/**
 * Builds the absolute URL for a page
 * @param page - Page to build URL for
 * @param config - Stati configuration
 * @returns Absolute URL
 */
function buildPageUrl(page: PageModel, config: StatiConfig): string {
  const baseUrl = config.site.baseUrl.replace(/\/$/, '');
  const pageUrl = page.url.startsWith('/') ? page.url : '/' + page.url;
  return baseUrl + pageUrl;
}

/**
 * Generates RSS XML for a single feed
 * @param pages - All pages in the site
 * @param config - Stati configuration
 * @param feedConfig - Feed configuration
 * @param logger - Logger instance for warnings (optional)
 * @returns RSS generation result
 */
export function generateRSSFeed(
  pages: PageModel[],
  config: StatiConfig,
  feedConfig: RSSFeedConfig,
  logger?: Logger,
): RSSGenerationResult {
  // Filter and sort pages
  let feedPages = filterPages(pages, feedConfig);
  feedPages = sortPages(feedPages, feedConfig);

  // Limit to maxItems if specified
  if (feedConfig.maxItems && feedConfig.maxItems > 0) {
    feedPages = feedPages.slice(0, feedConfig.maxItems);
  }

  // Build feed metadata
  const feedLink = feedConfig.link || config.site.baseUrl;
  const feedTitle = feedConfig.title;
  const feedDescription = feedConfig.description;

  // Start building XML
  const xmlLines: string[] = [];
  xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');

  // Build namespace attributes
  const namespaces = feedConfig.namespaces || {};
  const nsAttrs = Object.entries(namespaces)
    .map(([prefix, uri]) => `xmlns:${prefix}="${escapeHtml(uri)}"`)
    .join(' ');

  xmlLines.push(`<rss version="2.0"${nsAttrs ? ' ' + nsAttrs : ''}>`);
  xmlLines.push('  <channel>');
  xmlLines.push(`    <title>${escapeHtml(feedTitle)}</title>`);
  xmlLines.push(`    <link>${escapeHtml(feedLink)}</link>`);
  xmlLines.push(`    <description>${escapeHtml(feedDescription)}</description>`);

  // Optional channel elements
  if (feedConfig.language) {
    xmlLines.push(`    <language>${escapeHtml(feedConfig.language)}</language>`);
  }

  if (feedConfig.copyright) {
    xmlLines.push(`    <copyright>${escapeHtml(feedConfig.copyright)}</copyright>`);
  }

  if (feedConfig.managingEditor) {
    xmlLines.push(`    <managingEditor>${escapeHtml(feedConfig.managingEditor)}</managingEditor>`);
  }

  if (feedConfig.webMaster) {
    xmlLines.push(`    <webMaster>${escapeHtml(feedConfig.webMaster)}</webMaster>`);
  }

  // Publication date (current date)
  xmlLines.push(`    <pubDate>${formatRSSDate(new Date())}</pubDate>`);

  // Last build date
  xmlLines.push(`    <lastBuildDate>${formatRSSDate(new Date())}</lastBuildDate>`);

  if (feedConfig.category) {
    xmlLines.push(`    <category>${escapeHtml(feedConfig.category)}</category>`);
  }

  // Generator
  xmlLines.push(`    <generator>Stati Static Site Generator</generator>`);

  if (feedConfig.ttl) {
    xmlLines.push(`    <ttl>${feedConfig.ttl}</ttl>`);
  }

  // Image
  if (feedConfig.image) {
    xmlLines.push(`    <image>`);
    xmlLines.push(`      <url>${escapeHtml(feedConfig.image.url)}</url>`);
    xmlLines.push(`      <title>${escapeHtml(feedConfig.image.title)}</title>`);
    xmlLines.push(`      <link>${escapeHtml(feedConfig.image.link)}</link>`);
    if (feedConfig.image.width) {
      xmlLines.push(`      <width>${feedConfig.image.width}</width>`);
    }
    if (feedConfig.image.height) {
      xmlLines.push(`      <height>${feedConfig.image.height}</height>`);
    }
    xmlLines.push(`    </image>`);
  }

  // Add items
  const itemMapping = feedConfig.itemMapping || {};

  for (const page of feedPages) {
    xmlLines.push(`    <item>`);

    // Title
    const title = getFieldValue<string>(page, itemMapping.title, 'title', logger);
    if (title) {
      xmlLines.push(`      <title>${escapeHtml(title)}</title>`);
    }

    // Link
    let link: string;
    if (itemMapping.link) {
      link = itemMapping.link(page, config);
    } else {
      link = buildPageUrl(page, config);
    }
    xmlLines.push(`      <link>${escapeHtml(link)}</link>`);

    // Description (or full content)
    if (itemMapping.includeContent && page.content) {
      xmlLines.push(`      <description><![CDATA[${page.content}]]></description>`);
    } else {
      const description = getFieldValue<string>(
        page,
        itemMapping.description,
        'description',
        logger,
      );
      if (description) {
        xmlLines.push(`      <description>${escapeHtml(description)}</description>`);
      }
    }

    // Pub date
    const pubDate =
      getFieldValue<Date | string>(page, itemMapping.pubDate, 'publishedAt', logger) ||
      getFieldValue<Date | string>(page, itemMapping.pubDate, 'date', logger);
    const formattedPubDate = parseAndFormatDate(pubDate);
    if (formattedPubDate) {
      xmlLines.push(`      <pubDate>${formattedPubDate}</pubDate>`);
    }

    // Author
    const author = getFieldValue<string | undefined>(page, itemMapping.author, 'author', logger);
    if (author) {
      xmlLines.push(`      <author>${escapeHtml(author)}</author>`);
    }

    // Category/categories
    const category = getFieldValue<string | string[] | undefined>(
      page,
      itemMapping.category,
      'tags',
      logger,
    );
    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      for (const cat of categories) {
        xmlLines.push(`      <category>${escapeHtml(cat)}</category>`);
      }
    }

    // GUID
    let guid: string;
    if (itemMapping.guid) {
      guid = itemMapping.guid(page, config);
    } else {
      guid = link;
    }
    xmlLines.push(`      <guid isPermaLink="true">${escapeHtml(guid)}</guid>`);

    // Enclosure
    if (feedConfig.enclosure) {
      const enclosure = feedConfig.enclosure(page);
      if (enclosure) {
        xmlLines.push(
          `      <enclosure url="${escapeHtml(enclosure.url)}" length="${enclosure.length}" type="${escapeHtml(enclosure.type)}" />`,
        );
      }
    }

    // Custom elements
    if (feedConfig.customItemElements) {
      const customElements = feedConfig.customItemElements(page);
      for (const [key, value] of Object.entries(customElements)) {
        if (value !== undefined && value !== null) {
          xmlLines.push(`      <${key}>${escapeHtml(String(value))}</${key}>`);
        }
      }
    }

    xmlLines.push(`    </item>`);
  }

  xmlLines.push('  </channel>');
  xmlLines.push('</rss>');

  const xml = xmlLines.join('\n');

  return {
    filename: feedConfig.filename,
    itemCount: feedPages.length,
    sizeInBytes: Buffer.byteLength(xml, 'utf8'),
    xml,
  };
}

/**
 * Generates all RSS feeds configured in the site
 * @param pages - All pages in the site
 * @param config - Stati configuration
 * @param logger - Logger instance for warnings (optional)
 * @returns Array of RSS generation results
 */
export function generateRSSFeeds(
  pages: PageModel[],
  config: StatiConfig,
  logger?: Logger,
): RSSGenerationResult[] {
  const rssConfig = config.rss;
  if (!rssConfig || !rssConfig.enabled || !rssConfig.feeds) {
    return [];
  }

  const results: RSSGenerationResult[] = [];

  for (const feedConfig of rssConfig.feeds) {
    const result = generateRSSFeed(pages, config, feedConfig, logger);
    results.push(result);
  }

  return results;
}
