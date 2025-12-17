/**
 * Search index generator utilities.
 * @module search/generator
 */

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { minimatch } from 'minimatch';
import { writeFile, ensureDir } from '../core/utils/fs.utils.js';
import { SEARCH_INDEX_VERSION, SEARCH_DEFAULTS } from './constants.js';
import type { PageModel, TocEntry } from '../types/content.js';
import type {
  SearchConfig,
  SearchDocument,
  SearchIndex,
  SearchIndexMetadata,
} from '../types/search.js';

/**
 * Generates a short content hash for cache busting.
 * Uses MD5 and returns first 8 characters.
 *
 * @param content - Content to hash
 * @returns 8-character hash string
 */
export function generateContentHash(content: string): string {
  return createHash('md5').update(content).digest('hex').substring(0, 8);
}

/**
 * Builds a breadcrumb string from a URL path.
 *
 * @param url - Page URL path (e.g., '/getting-started/installation')
 * @param pageTitle - Page title to use as the last segment
 * @returns Breadcrumb string (e.g., 'Getting Started > Installation')
 */
export function buildBreadcrumb(url: string, pageTitle: string): string {
  if (url === '/' || url === '') {
    return pageTitle;
  }

  const segments = url.split('/').filter(Boolean);

  if (segments.length === 0) {
    return pageTitle;
  }

  // Convert slug segments to title case
  const crumbs = segments.slice(0, -1).map((segment) =>
    segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  );

  // Add the page title as the last crumb
  crumbs.push(pageTitle);

  return crumbs.join(' > ');
}

/**
 * Strips Markdown syntax to extract plain text for search indexing.
 * Handles code blocks, links, images, emphasis, etc.
 *
 * @param markdown - Raw markdown content
 * @returns Plain text content
 */
export function stripMarkdown(markdown: string): string {
  let text = markdown;

  // Remove code blocks (fenced and indented)
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`[^`]+`/g, ' ');

  // Remove images ![alt](url)
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');

  // Convert links [text](url) to just text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Remove reference-style link definitions [id]: url
  text = text.replace(/^\[[^\]]+\]:\s*\S+.*$/gm, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Remove emphasis markers (bold, italic)
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');

  // Remove strikethrough
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Remove headings markers (but keep the text)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove blockquote markers
  text = text.replace(/^>\s*/gm, '');

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');

  // Remove list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extracts searchable sections from page data using TOC entries and markdown content.
 * This is more efficient than parsing rendered HTML as it uses structured data
 * already available from the markdown processing pipeline.
 *
 * @param toc - Table of contents entries with heading IDs, text, and levels
 * @param markdownContent - Raw markdown content of the page
 * @param pageUrl - Page URL path
 * @param pageTitle - Page title from frontmatter
 * @param tags - Optional tags from frontmatter
 * @param config - Search configuration
 * @returns Array of SearchDocument objects
 */
export function extractSectionsFromMarkdown(
  toc: TocEntry[],
  markdownContent: string,
  pageUrl: string,
  pageTitle: string,
  tags: readonly string[] | undefined,
  config: SearchConfig,
): SearchDocument[] {
  const documents: SearchDocument[] = [];
  const headingLevels = config.headingLevels ?? SEARCH_DEFAULTS.headingLevels;
  const maxContentLength = config.maxContentLength ?? SEARCH_DEFAULTS.maxContentLength;
  const maxPreviewLength = config.maxPreviewLength ?? SEARCH_DEFAULTS.maxPreviewLength;

  const breadcrumb = buildBreadcrumb(pageUrl, pageTitle);

  // Filter TOC entries to only include configured heading levels
  const filteredToc = toc.filter((entry) => headingLevels.includes(entry.level));

  // Find heading positions in markdown content
  // Headings in markdown are lines starting with # symbols
  const lines = markdownContent.split('\n');
  const headingPositions: Array<{
    entry: TocEntry;
    lineIndex: number;
    charIndex: number;
  }> = [];

  // Build a map of heading text to TOC entries for matching
  let charIndex = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? '';
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);

    if (headingMatch) {
      const headingText = headingMatch[2]?.trim() ?? '';
      // Find matching TOC entry by text (case-insensitive, normalized)
      const normalizedText = headingText.toLowerCase().replace(/[*_`[\]]/g, '');
      const matchingEntry = filteredToc.find(
        (entry) => entry.text.toLowerCase() === normalizedText || entry.text === headingText,
      );

      if (matchingEntry) {
        headingPositions.push({
          entry: matchingEntry,
          lineIndex,
          charIndex,
        });
      }
    }
    charIndex += line.length + 1; // +1 for newline
  }

  // Extract content before first heading for page-level document
  const firstHeadingChar = headingPositions[0]?.charIndex ?? markdownContent.length;
  const pageContentMarkdown = markdownContent.substring(0, firstHeadingChar);
  const pageContent = stripMarkdown(pageContentMarkdown).substring(0, maxPreviewLength);

  // Create page-level document (level 1 = page title)
  documents.push({
    id: `${pageUrl}#top`,
    url: pageUrl,
    anchor: '',
    title: pageTitle,
    heading: pageTitle,
    level: 1,
    content: pageContent,
    breadcrumb,
    ...(tags && tags.length > 0 ? { tags: [...tags] } : {}),
  });

  // Create documents for each heading section
  for (let i = 0; i < headingPositions.length; i++) {
    const pos = headingPositions[i];
    if (!pos) continue;

    const nextPos = headingPositions[i + 1];
    const sectionStart = pos.charIndex;
    const sectionEnd = nextPos ? nextPos.charIndex : markdownContent.length;

    // Extract section content (skip the heading line itself)
    const sectionLines = markdownContent.substring(sectionStart, sectionEnd).split('\n');
    const contentLines = sectionLines.slice(1); // Skip heading line
    const sectionMarkdown = contentLines.join('\n');
    const sectionContent = stripMarkdown(sectionMarkdown).substring(0, maxContentLength);

    // Skip empty sections
    if (!sectionContent.trim()) {
      continue;
    }

    documents.push({
      id: `${pageUrl}#${pos.entry.id}`,
      url: pageUrl,
      anchor: pos.entry.id,
      title: pageTitle,
      heading: pos.entry.text,
      level: pos.entry.level,
      content: sectionContent,
      breadcrumb: `${breadcrumb} > ${pos.entry.text}`,
      ...(tags && tags.length > 0 ? { tags: [...tags] } : {}),
    });
  }

  return documents;
}

/**
 * Checks if a page should be excluded from the search index.
 *
 * @param page - Page model to check
 * @param config - Search configuration
 * @returns true if the page should be excluded
 */
export function shouldExcludePage(page: PageModel, config: SearchConfig): boolean {
  // Exclude drafts
  if (page.frontMatter.draft) {
    return true;
  }

  // Check home page exclusion
  const isHomePage = page.url === '/' || page.url === '';
  const includeHomePage = config.includeHomePage ?? SEARCH_DEFAULTS.includeHomePage;
  if (isHomePage && !includeHomePage) {
    return true;
  }

  // Check exclude patterns
  const excludePatterns = config.exclude ?? SEARCH_DEFAULTS.exclude;
  for (const pattern of excludePatterns) {
    if (minimatch(page.url, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Page data for search indexing using markdown and TOC entries.
 * Uses structured data already available from the markdown processing pipeline.
 */
export interface SearchablePage {
  /** The page model with metadata */
  page: PageModel;
  /** Table of contents entries extracted during markdown rendering */
  toc: TocEntry[];
  /** Raw markdown content for section extraction */
  markdownContent: string;
}

/**
 * Generates a search index from searchable pages using markdown and TOC data.
 *
 * @param searchablePages - Array of pages with TOC and markdown content
 * @param config - Search configuration
 * @returns SearchIndex object
 */
export function generateSearchIndex(
  searchablePages: SearchablePage[],
  config: SearchConfig,
): SearchIndex {
  const documents: SearchDocument[] = [];

  for (const { page, toc, markdownContent } of searchablePages) {
    // Skip excluded pages
    if (shouldExcludePage(page, config)) {
      continue;
    }

    const pageTitle = page.frontMatter.title || page.slug;
    const tags = page.frontMatter.tags;

    const pageDocs = extractSectionsFromMarkdown(
      toc,
      markdownContent,
      page.url,
      pageTitle,
      tags,
      config,
    );
    documents.push(...pageDocs);
  }

  return {
    version: SEARCH_INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    documentCount: documents.length,
    documents,
  };
}

/**
 * Writes the search index to a JSON file.
 *
 * @param searchIndex - The search index to write
 * @param outDir - Output directory path
 * @param filename - Pre-computed filename (from computeSearchIndexFilename)
 * @returns Metadata about the written search index
 */
export async function writeSearchIndex(
  searchIndex: SearchIndex,
  outDir: string,
  filename: string,
): Promise<SearchIndexMetadata> {
  // Serialize index
  const content = JSON.stringify(searchIndex, null, 0);

  // Ensure output directory exists
  await ensureDir(outDir);

  // Write the file
  const filePath = join(outDir, filename);
  await writeFile(filePath, content, 'utf-8');

  return {
    enabled: true,
    indexPath: `/${filename}`,
    documentCount: searchIndex.documentCount,
  };
}

/**
 * Computes the search index filename based on configuration.
 * When hashFilename is true, generates a deterministic hash based on the build ID.
 * This allows the filename to be known before the index is generated,
 * enabling meta tag injection during initial template render.
 *
 * @param config - Search configuration
 * @param buildId - Unique identifier for this build (e.g., timestamp or build ID)
 * @returns The search index filename (without leading slash)
 *
 * @example
 * ```typescript
 * // At build start, compute the filename
 * const filename = computeSearchIndexFilename(config.search, Date.now().toString());
 * // filename: 'search-index-a1b2c3d4.json' (when hashFilename is true)
 * // filename: 'search-index.json' (when hashFilename is false)
 * ```
 */
export function computeSearchIndexFilename(config: SearchConfig, buildId?: string): string {
  const indexName = config.indexName ?? SEARCH_DEFAULTS.indexName;
  const hashFilename = config.hashFilename ?? SEARCH_DEFAULTS.hashFilename;

  if (hashFilename) {
    // Generate a deterministic hash based on build ID
    // This allows the filename to be known before content is generated
    const hashInput = buildId ?? Date.now().toString();
    const hash = generateContentHash(hashInput);
    return `${indexName}-${hash}.json`;
  }

  // Return base filename (without hash)
  return `${indexName}.json`;
}
