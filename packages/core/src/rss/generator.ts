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
import {
  createFallbackLogger,
  getFrontMatterDate,
  isNotFoundPage,
  isVirtualPage,
} from '../core/utils/index.js';

/** A value with a scheme (`https://`, `mailto:`) or a protocol-relative one (`//cdn.example`) */
const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** A prefixed or plain XML name; names that start with `xml` are reserved by the XML spec */
const XML_NAME = /^(?!xml)[A-Za-z_][A-Za-z0-9_.-]*(?::[A-Za-z_][A-Za-z0-9_.-]*)?$/i;

/** What an item's mapping callbacks and warnings need */
interface ItemContext {
  config: StatiConfig;
  feedConfig: RSSFeedConfig;
  logger: Logger;
  /** Custom element names already reported, so a bad name warns once per feed */
  warnedElementNames: Set<string>;
}

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

  // Generated and pagination pages share their template's source path, so patterns can't
  // tell them apart from content; feeds list content only, and never the 404 page
  const contentPages = pages.filter((page) => !isVirtualPage(page) && !isNotFoundPage(page));
  let filtered = filterByPatterns(contentPages, (page) => page.sourcePath, options);

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
function getPageDate(page: PageModel): Date | undefined {
  return getFrontMatterDate(page.frontMatter);
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
        const comparison = dateA.getTime() - dateB.getTime();
        return sortBy === 'date-asc' ? comparison : -comparison;
      }
      case 'title-asc':
      case 'title-desc': {
        const titleA = String(a.frontMatter.title || '').toLowerCase();
        const titleB = String(b.frontMatter.title || '').toLowerCase();
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
 * Makes a URL absolute. Absolute and protocol-relative URLs are kept; anything else is a
 * path from the site root and goes behind `site.baseUrl`, base path included.
 * @param value - URL or site path
 * @param config - Stati configuration
 * @returns Absolute URL
 */
function toAbsoluteUrl(value: string, config: StatiConfig): string {
  if (ABSOLUTE_URL.test(value)) return value;
  const baseUrl = config.site.baseUrl.replace(/\/$/, '');
  const path = value.replace(/^\.\//, '');
  return baseUrl + (path.startsWith('/') ? path : '/' + path);
}

/**
 * Builds the absolute URL for a page
 * @param page - Page to build URL for
 * @param config - Stati configuration
 * @returns Absolute URL
 */
function buildPageUrl(page: PageModel, config: StatiConfig): string {
  return toAbsoluteUrl(page.url, config);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs a mapping callback for one page. A callback that throws is reported as a warning
 * that names the feed and page, so one bad page cannot take the feed down.
 * @returns The callback's result, or undefined when it threw
 */
function callMapping<T>(
  context: ItemContext,
  page: PageModel,
  what: string,
  outcome: string,
  call: () => T,
): T | undefined {
  try {
    return call();
  } catch (error) {
    context.logger.warning(
      `RSS feed '${context.feedConfig.filename}': ${what} failed for page ${page.slug} (${outcome}): ${describeError(error)}`,
    );
    return undefined;
  }
}

/**
 * Formats an author for the `<author>` element: text as written, or an author object
 * (`name`, `email`) as `email (name)`, which is the form RSS expects. A list of authors
 * is joined with commas.
 * @returns The author text, or undefined when the value has none
 */
function formatAuthor(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatAuthor).filter(Boolean).join(', ') || undefined;
  }
  if (!isValidRecord(value)) {
    return undefined;
  }
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const email = typeof value.email === 'string' ? value.email.trim() : '';
  if (email && name) return `${email} (${name})`;
  return email || name || undefined;
}

/**
 * Builds the XML lines of one item.
 * @returns The lines, or undefined when the item has to be left out
 */
function buildItem(page: PageModel, context: ItemContext): string[] | undefined {
  const { config, feedConfig, logger } = context;
  const itemMapping = feedConfig.itemMapping || {};

  // Link: an item without one is left out, since a guessed URL would send readers elsewhere
  let link: string | undefined;
  if (itemMapping.link) {
    const mapped = callMapping(context, page, 'link mapping', 'item skipped', () =>
      itemMapping.link!(page, config),
    );
    if (mapped === undefined) return undefined;
    if (typeof mapped !== 'string' || !mapped.trim()) {
      logger.warning(
        `RSS feed '${feedConfig.filename}': link mapping returned no URL for page ${page.slug} (item skipped)`,
      );
      return undefined;
    }
    link = toAbsoluteUrl(mapped.trim(), config);
  } else {
    link = buildPageUrl(page, config);
  }

  const lines: string[] = [`    <item>`];

  // Title
  const title = getFieldValue<string>(page, itemMapping.title, 'title', logger);
  if (title) {
    lines.push(`      <title>${escapeHtml(title)}</title>`);
  }

  lines.push(`      <link>${escapeHtml(link)}</link>`);

  // Description (or full content)
  if (itemMapping.includeContent && page.content) {
    lines.push(`      <description><![CDATA[${page.content}]]></description>`);
  } else {
    const description = getFieldValue<string>(page, itemMapping.description, 'description', logger);
    if (description) {
      lines.push(`      <description>${escapeHtml(description)}</description>`);
    }
  }

  // Pub date
  const pubDate = itemMapping.pubDate
    ? getFieldValue<Date | string>(page, itemMapping.pubDate, undefined, logger)
    : getPageDate(page);
  const formattedPubDate = parseAndFormatDate(pubDate);
  if (formattedPubDate) {
    lines.push(`      <pubDate>${formattedPubDate}</pubDate>`);
  }

  // Author
  const rawAuthor = getFieldValue<unknown>(page, itemMapping.author, 'author', logger);
  const author = formatAuthor(rawAuthor);
  if (author) {
    lines.push(`      <author>${escapeHtml(author)}</author>`);
  } else if (rawAuthor !== undefined && typeof rawAuthor !== 'string') {
    logger.warning(
      `RSS feed '${feedConfig.filename}': the author of page ${page.slug} is neither text nor an object with name or email (author left out)`,
    );
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
      lines.push(`      <category>${escapeHtml(cat)}</category>`);
    }
  }

  // GUID: a permalink only when it is an absolute URL
  let guid: string | undefined = link;
  if (itemMapping.guid) {
    const mapped = callMapping(context, page, 'guid mapping', 'guid left out', () =>
      itemMapping.guid!(page, config),
    );
    guid = mapped === undefined ? undefined : String(mapped ?? '') || link;
  }
  if (guid !== undefined) {
    const isPermaLink = /^https?:\/\//i.test(guid);
    lines.push(`      <guid isPermaLink="${isPermaLink}">${escapeHtml(guid)}</guid>`);
  }

  // Enclosure
  if (feedConfig.enclosure) {
    const enclosure = callMapping(context, page, 'enclosure mapping', 'enclosure left out', () =>
      feedConfig.enclosure!(page),
    );
    if (enclosure) {
      if (typeof enclosure.url !== 'string' || !enclosure.url) {
        logger.warning(
          `RSS feed '${feedConfig.filename}': the enclosure of page ${page.slug} has no url (enclosure left out)`,
        );
      } else {
        // RSS requires a length; 0 means unknown
        const length =
          Number.isFinite(enclosure.length) && enclosure.length >= 0
            ? Math.trunc(enclosure.length)
            : 0;
        lines.push(
          `      <enclosure url="${escapeHtml(toAbsoluteUrl(enclosure.url, config))}" length="${length}" type="${escapeHtml(enclosure.type)}" />`,
        );
      }
    }
  }

  // Custom elements
  if (feedConfig.customItemElements) {
    const customElements = callMapping(
      context,
      page,
      'customItemElements',
      'extra elements left out',
      () => feedConfig.customItemElements!(page),
    );
    if (isValidRecord(customElements)) {
      for (const [key, value] of Object.entries(customElements)) {
        if (!XML_NAME.test(key)) {
          if (!context.warnedElementNames.has(key)) {
            context.warnedElementNames.add(key);
            logger.warning(
              `RSS feed '${feedConfig.filename}': customItemElements key '${key}' is not a valid XML element name (element left out)`,
            );
          }
          continue;
        }
        if (value !== undefined && value !== null) {
          lines.push(`      <${key}>${escapeHtml(String(value))}</${key}>`);
        }
      }
    }
  }

  lines.push(`    </item>`);
  return lines;
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
  const context: ItemContext = {
    config,
    feedConfig,
    logger: logger ?? createFallbackLogger(),
    warnedElementNames: new Set(),
  };

  // Filter and sort pages
  let feedPages = sortPages(filterPages(pages, feedConfig), feedConfig);

  // Limit to maxItems if specified
  if (feedConfig.maxItems && feedConfig.maxItems > 0) {
    feedPages = feedPages.slice(0, feedConfig.maxItems);
  }

  // Build feed metadata
  const feedLink = toAbsoluteUrl(feedConfig.link || config.site.baseUrl, config);
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

  // Publication date and last build date (use same timestamp for consistency)
  const buildDate = new Date();
  xmlLines.push(`    <pubDate>${formatRSSDate(buildDate)}</pubDate>`);

  // Last build date
  xmlLines.push(`    <lastBuildDate>${formatRSSDate(buildDate)}</lastBuildDate>`);

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
    xmlLines.push(`      <url>${escapeHtml(toAbsoluteUrl(feedConfig.image.url, config))}</url>`);
    xmlLines.push(`      <title>${escapeHtml(feedConfig.image.title)}</title>`);
    xmlLines.push(`      <link>${escapeHtml(toAbsoluteUrl(feedConfig.image.link, config))}</link>`);
    if (feedConfig.image.width) {
      xmlLines.push(`      <width>${feedConfig.image.width}</width>`);
    }
    if (feedConfig.image.height) {
      xmlLines.push(`      <height>${feedConfig.image.height}</height>`);
    }
    xmlLines.push(`    </image>`);
  }

  // Add items
  let itemCount = 0;
  for (const page of feedPages) {
    const item = buildItem(page, context);
    if (item) {
      xmlLines.push(...item);
      itemCount++;
    }
  }

  xmlLines.push('  </channel>');
  xmlLines.push('</rss>');

  const xml = xmlLines.join('\n');

  return {
    filename: feedConfig.filename,
    itemCount,
    sizeInBytes: Buffer.byteLength(xml, 'utf8'),
    xml,
  };
}

/**
 * Generates all RSS feeds configured in the site
 * @param pages - All pages in the site
 * @param config - Stati configuration
 * @param logger - Logger instance for warnings (optional)
 * @returns Array of RSS generation results, without the feeds that failed
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

  const log = logger ?? createFallbackLogger();
  const results: RSSGenerationResult[] = [];

  // A feed that cannot be generated is reported and the others still are
  for (const feedConfig of rssConfig.feeds) {
    try {
      results.push(generateRSSFeed(pages, config, feedConfig, log));
    } catch (error) {
      log.error(`Failed to generate RSS feed '${feedConfig.filename}': ${describeError(error)}`);
    }
  }

  return results;
}
