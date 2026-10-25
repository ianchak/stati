/**
 * Search index generator utilities.
 * @module search/generator
 */

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { writeFile, ensureDir, readdir, remove } from '../core/utils/fs.utils.js';
import { matchesGlob } from '../core/utils/glob-patterns.utils.js';
import { isNotFoundPage, isVirtualPage } from '../core/utils/template-discovery.utils.js';
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
 * URL segments that read as acronyms and stay uppercase in breadcrumbs.
 */
const BREADCRUMB_ACRONYMS = new Set([
  'ai',
  'api',
  'cli',
  'css',
  'faq',
  'html',
  'isg',
  'json',
  'rss',
  'seo',
  'ui',
  'url',
  'xml',
]);

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

  // Convert slug segments to title case, keeping known acronyms uppercase
  const crumbs = segments.slice(0, -1).map((segment) =>
    segment
      .split('-')
      .map((word) =>
        BREADCRUMB_ACRONYMS.has(word.toLowerCase())
          ? word.toUpperCase()
          : word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join(' '),
  );

  // Add the page title as the last crumb
  crumbs.push(pageTitle);

  return crumbs.join(' > ');
}

/**
 * Fenced code blocks, one expression for backtick fences and one for tilde fences. A fence opens
 * at the start of a line, after any blockquote or list marker, and runs to a matching fence or,
 * as in CommonMark, to the end of the text. The info string of a backtick fence holds no
 * backtick, so an inline span written with three backticks at the start of a line is not a fence.
 */
const FENCED_CODE_BLOCKS = [
  /^[ \t>]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?(`{3,})[^`\n]*\n[\s\S]*?(?:^[ \t>]*\1[`~]*[ \t]*$|(?![\s\S]))/gm,
  /^[ \t>]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?(~{3,})[^\n]*\n[\s\S]*?(?:^[ \t>]*\1[`~]*[ \t]*$|(?![\s\S]))/gm,
];

/** Private-use character that brackets inline code placeholders in stripMarkdown. */
const CODE_MARK = '';

/**
 * Strips Markdown syntax to extract plain text for search indexing.
 * Handles code blocks, links, images, emphasis, etc.
 *
 * @param markdown - Raw markdown content
 * @returns Plain text content
 */
export function stripMarkdown(markdown: string): string {
  let text = markdown;

  // Remove fenced code blocks. Fences sit at the start of a line, so inline
  // spans written with three or more backticks are left for the step below.
  for (const fenced of FENCED_CODE_BLOCKS) {
    text = text.replace(fenced, ' ');
  }

  // Keep inline code text (identifiers are what people search for), shielded
  // from the emphasis and HTML stripping below and restored at the end.
  // A span closes on a backtick run of the same length as its opener, so
  // ``a `b` c`` is one span; one padding space on each side is dropped.
  const inlineCode: string[] = [];
  text = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_match, _fence: string, code: string) => {
    inlineCode.push(/^ [\s\S]* $/.test(code) && code.trim() ? code.slice(1, -1) : code);
    return `${CODE_MARK}${inlineCode.length - 1}${CODE_MARK}`;
  });

  // Remove table delimiter rows and cell pipes
  text = text.replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, '');
  text = text.replace(/\s*\|\s*/g, ' ');

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

  // Restore inline code
  text = text.replace(
    new RegExp(`${CODE_MARK}(\\d+)${CODE_MARK}`, 'g'),
    (_match, index: string) => inlineCode[Number(index)] ?? '',
  );

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

  // Exclude generated and pagination pages unless their template opts in
  if (isGeneratedPageExcludedFromSearch(page)) {
    return true;
  }

  // Exclude the 404 page unless it opts in
  if (isNotFoundPage(page) && page.frontMatter.search !== true) {
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
    if (matchesGlob(page.url, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Whether a page created by Stati stays out of the search index. Pages generated from a
 * `[param].md` template are left out unless the template sets `search: true`; later pages
 * of a paginated listing are always left out, since they repeat the first page's content.
 *
 * @param page - Page model to check
 * @returns true for generated and pagination pages that are not indexed
 */
export function isGeneratedPageExcludedFromSearch(page: PageModel): boolean {
  if (!isVirtualPage(page)) {
    return false;
  }
  const firstPage = (page.pagination?.pageNumber ?? 1) === 1;
  return !(page.generated && firstPage && page.frontMatter.search === true);
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
 * Skips write if content hasn't changed (dev mode optimization).
 *
 * @param searchIndex - The search index to write
 * @param outDir - Output directory path
 * @param filename - Pre-computed filename (from computeSearchIndexFilename)
 * @param skipIfUnchanged - If true, skip write when document count matches previous
 * @returns Metadata about the written search index
 */

// Cache for search index state (dev mode optimization)
let lastSearchIndexDocCount: number | null = null;
let lastSearchIndexContentHash: string | null = null;

export async function writeSearchIndex(
  searchIndex: SearchIndex,
  outDir: string,
  filename: string,
  skipIfUnchanged = false,
): Promise<SearchIndexMetadata> {
  // Serialize full index for hash computation and potential write
  const content = JSON.stringify(searchIndex, null, 0);

  // Skip write if content hash hasn't changed (dev mode optimization)
  // Uses fast MD5 hash to detect actual content changes, not just count
  if (skipIfUnchanged && lastSearchIndexDocCount === searchIndex.documentCount) {
    const contentHash = generateContentHash(content);
    if (contentHash === lastSearchIndexContentHash) {
      return {
        enabled: true,
        indexPath: `/${filename}`,
        documentCount: searchIndex.documentCount,
      };
    }
    // Count matched but content changed - update hash and proceed to write
    lastSearchIndexContentHash = contentHash;
  }

  // Update cached state
  lastSearchIndexDocCount = searchIndex.documentCount;
  if (skipIfUnchanged && !lastSearchIndexContentHash) {
    lastSearchIndexContentHash = generateContentHash(content);
  }

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
 * When hashFilename is true, the name carries a hash of `hashInput`. Production builds pass
 * the index content, so the name changes only when the indexed text does; every page links to
 * the index, so the name is part of each page's cache hash.
 *
 * @param config - Search configuration
 * @param hashInput - The value the hash is computed from, such as the serialized documents
 * @returns The search index filename (without leading slash)
 *
 * @example
 * ```typescript
 * const filename = computeSearchIndexFilename(config.search, JSON.stringify(index.documents));
 * // filename: 'search-index-a1b2c3d4.json' (when hashFilename is true)
 * // filename: 'search-index.json' (when hashFilename is false)
 * ```
 */
export function computeSearchIndexFilename(config: SearchConfig, hashInput?: string): string {
  const indexName = config.indexName ?? SEARCH_DEFAULTS.indexName;
  const hashFilename = config.hashFilename ?? SEARCH_DEFAULTS.hashFilename;

  if (hashFilename) {
    const hash = generateContentHash(hashInput ?? Date.now().toString());
    return `${indexName}-${hash}.json`;
  }

  // Return base filename (without hash)
  return `${indexName}.json`;
}

/**
 * Deletes search index files that earlier builds wrote under another name: hashed files from
 * builds whose indexed text differed, and the file of a build with the other `hashFilename`
 * setting. Only files in the output directory named after `indexName` are deleted, never the
 * current one.
 *
 * @param outDir - The output directory
 * @param config - Search configuration
 * @param currentFilename - The index file this build wrote
 * @returns The deleted file names
 */
export async function removeStaleSearchIndexes(
  outDir: string,
  config: SearchConfig,
  currentFilename: string,
): Promise<string[]> {
  const indexName = (config.indexName ?? SEARCH_DEFAULTS.indexName).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
  // name.json and name-HASH.json (generateContentHash's 8 hex characters)
  const pattern = new RegExp(`^${indexName}(?:-[0-9a-f]{8})?\\.json$`);

  const entries = await readdir(outDir, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    return [];
  }

  // Files only: remove() deletes folders with their contents, and links are left alone
  const stale = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((file) => file !== currentFilename && pattern.test(file));
  await Promise.all(stale.map((file) => remove(join(outDir, file))));
  return stale;
}
