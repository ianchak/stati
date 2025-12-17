import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { StatiConfig, TocEntry } from '../types/index.js';
import { slugify } from './utils/index.js';

/**
 * Result of rendering markdown content.
 */
export interface MarkdownResult {
  /** The rendered HTML content */
  html: string;
  /** Table of contents entries extracted from headings */
  toc: TocEntry[];
}

/**
 * Load a markdown plugin, trying different resolution strategies
 */
async function loadMarkdownPlugin(pluginName: string) {
  const fullPluginName = `markdown-it-${pluginName}`;

  // Try importing from current working directory first (for projects using Stati)
  try {
    const require = createRequire(pathToFileURL(path.resolve(process.cwd(), 'package.json')));
    const pluginPath = require.resolve(fullPluginName);
    return await import(pathToFileURL(pluginPath).href);
  } catch {
    // Fallback to standard resolution (for core package dependencies)
    return await import(fullPluginName);
  }
}

/**
 * Creates and configures a MarkdownIt processor based on the provided configuration.
 * Supports both plugin array format and configure function format.
 */
export async function createMarkdownProcessor(config: StatiConfig): Promise<MarkdownIt> {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  // Apply plugins from array format
  if (config.markdown?.plugins) {
    for (const plugin of config.markdown.plugins) {
      if (typeof plugin === 'string') {
        // Plugin name only
        try {
          const pluginModule = await loadMarkdownPlugin(plugin);
          const pluginFunction = pluginModule.default || pluginModule;
          md.use(pluginFunction);
        } catch (error) {
          console.warn(`Failed to load markdown plugin: markdown-it-${plugin}`, error);
        }
      } else if (Array.isArray(plugin) && plugin.length >= 1) {
        // Plugin name with options [name, options]
        const [pluginName, options] = plugin;
        try {
          const pluginModule = await loadMarkdownPlugin(pluginName);
          const pluginFunction = pluginModule.default || pluginModule;
          md.use(pluginFunction, options);
        } catch (error) {
          console.warn(`Failed to load markdown plugin: markdown-it-${pluginName}`, error);
        }
      }
    }
  }

  // Apply user configuration function (this runs after plugins for override capability)
  if (config.markdown?.configure) {
    config.markdown.configure(md);
  }

  return md;
}

/**
 * Extracts text content from an inline token, handling nested children.
 * Recursively processes all token types to capture text from links, images,
 * code, and other inline elements.
 *
 * @param token - The inline token to extract text from
 * @returns Plain text content
 */
function extractTextFromToken(token: Token): string {
  // Handle tokens with children by recursively extracting from all children
  if (token.children && token.children.length > 0) {
    return token.children.map((child) => extractTextFromToken(child)).join('');
  }

  // For leaf tokens, return their content
  // This handles 'text', 'code_inline', and other inline token types
  return token.content || '';
}

/**
 * Extracts TOC entries from tokens and injects anchor IDs into heading tokens.
 *
 * @param tokens - The parsed markdown tokens
 * @param tocEnabled - Whether TOC extraction is enabled
 * @returns Array of TOC entries
 */
function extractAndInjectAnchors(tokens: Token[], tocEnabled: boolean): TocEntry[] {
  if (!tocEnabled) {
    return [];
  }

  const toc: TocEntry[] = [];
  const usedIds = new Map<string, number>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;

    if (token.type === 'heading_open') {
      // Extract level from tag (h1, h2, etc.)
      const level = parseInt(token.tag.slice(1), 10);

      // Only include levels 2-6 in TOC (skip h1)
      if (level >= 2 && level <= 6) {
        // Get the inline token that follows (contains heading text)
        const inlineToken = tokens[i + 1];
        if (inlineToken && inlineToken.type === 'inline') {
          const text = extractTextFromToken(inlineToken);
          let baseId = slugify(text);

          // Fallback for empty slugs (e.g., headings with only emojis or special characters)
          if (!baseId) {
            baseId = 'heading';
          }

          // Handle duplicate IDs
          let id = baseId;
          const count = usedIds.get(baseId) || 0;
          if (count > 0) {
            id = `${baseId}-${count}`;
          }
          usedIds.set(baseId, count + 1);

          // Inject the id attribute into the heading_open token
          token.attrSet('id', id);

          toc.push({ id, text, level });
        }
      }
    }
  }

  return toc;
}

/**
 * Extracts table of contents entries from markdown content without rendering HTML.
 * This is more efficient than renderMarkdown when only TOC data is needed.
 *
 * @param content - The markdown content to extract TOC from
 * @param md - The configured MarkdownIt instance
 * @returns Array of TOC entries extracted from headings (levels 2-6)
 */
export function extractToc(content: string, md: MarkdownIt): TocEntry[] {
  const tokens = md.parse(content, {});
  return extractAndInjectAnchors(tokens, true);
}

/**
 * Renders markdown content to HTML with optional TOC extraction.
 *
 * @param content - The markdown content to render
 * @param md - The configured MarkdownIt instance
 * @param tocEnabled - Whether to extract TOC and inject heading anchors (default: true)
 * @returns Object containing rendered HTML and TOC entries
 */
export function renderMarkdown(
  content: string,
  md: MarkdownIt,
  tocEnabled: boolean = true,
): MarkdownResult {
  // Parse content into tokens
  const tokens = md.parse(content, {});

  // Extract TOC and inject anchor IDs
  const toc = extractAndInjectAnchors(tokens, tocEnabled);

  // Render tokens to HTML
  const html = md.renderer.render(tokens, md.options, {});

  return { html, toc };
}
