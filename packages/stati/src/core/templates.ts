import { Eta } from 'eta';
import { join, dirname, relative, basename } from 'path';
import { pathExists } from 'fs-extra';
import { glob } from 'fast-glob';
import type { StatiConfig, PageModel, NavNode } from '../types.js';

/**
 * Discovers partials in the hierarchy for a given page path.
 * Scans all parent directories for folders starting with underscore.
 *
 * @param pagePath - The path to the page (relative to srcDir)
 * @param config - Stati configuration
 * @returns Object mapping partial names to their file paths
 */
async function discoverPartials(
  pagePath: string,
  config: StatiConfig,
): Promise<Record<string, string>> {
  const srcDir = join(process.cwd(), config.srcDir!);
  const partials: Record<string, string> = {};

  // Get the directory of the current page
  const pageDir = dirname(pagePath);
  const pathSegments = pageDir === '.' ? [] : pageDir.split('/');

  // Scan from root to current directory
  const dirsToScan = [''];
  for (let i = 0; i < pathSegments.length; i++) {
    dirsToScan.push(pathSegments.slice(0, i + 1).join('/'));
  }

  for (const dir of dirsToScan) {
    const searchDir = dir ? join(srcDir, dir) : srcDir;

    // Find all underscore folders in this directory level
    const underscoreFolders = await glob('_*/', {
      cwd: searchDir,
      onlyDirectories: true,
    });

    // Scan each underscore folder for .eta files
    for (const folder of underscoreFolders) {
      const folderPath = join(searchDir, folder);
      const etaFiles = await glob('**/*.eta', {
        cwd: folderPath,
        absolute: false,
      });

      for (const etaFile of etaFiles) {
        const partialName = basename(etaFile, '.eta');
        const fullPath = join(folderPath, etaFile);
        const relativePath = relative(srcDir, fullPath);

        // Store the relative path from srcDir for Eta to find it
        partials[partialName] = relativePath;
      }
    }
  }

  return partials;
}

/**
 * Discovers the appropriate layout file for a given page path.
 * Implements the hierarchical layout.eta convention by searching
 * from the page's directory up to the root.
 *
 * @param pagePath - The path to the page (relative to srcDir)
 * @param config - Stati configuration
 * @param explicitLayout - Layout specified in front matter (takes precedence)
 * @returns The layout file path or null if none found
 */
async function discoverLayout(
  pagePath: string,
  config: StatiConfig,
  explicitLayout?: string,
): Promise<string | null> {
  const srcDir = join(process.cwd(), config.srcDir!);

  // If explicit layout is specified, use it
  if (explicitLayout) {
    const layoutPath = join(srcDir, `${explicitLayout}.eta`);
    if (await pathExists(layoutPath)) {
      return `${explicitLayout}.eta`;
    }
  }

  // Get the directory of the current page
  const pageDir = dirname(pagePath);
  const pathSegments = pageDir === '.' ? [] : pageDir.split(/[/\\]/); // Handle both separators

  // Search for layout.eta from current directory up to root
  const dirsToSearch = [];

  // Add current directory if not root
  if (pathSegments.length > 0) {
    for (let i = pathSegments.length; i > 0; i--) {
      dirsToSearch.push(pathSegments.slice(0, i).join('/'));
    }
  }

  // Add root directory
  dirsToSearch.push('');

  for (const dir of dirsToSearch) {
    const layoutPath = dir ? join(srcDir, dir, 'layout.eta') : join(srcDir, 'layout.eta');
    if (await pathExists(layoutPath)) {
      // Return relative path with forward slashes for Eta
      const relativePath = dir ? `${dir}/layout.eta` : 'layout.eta';
      return relativePath.replace(/\\/g, '/'); // Normalize to forward slashes
    }
  }

  // Fall back to default.eta at root
  const defaultLayoutPath = join(srcDir, 'default.eta');
  if (await pathExists(defaultLayoutPath)) {
    return 'default.eta';
  }

  return null;
}

export function createTemplateEngine(config: StatiConfig): Eta {
  const templateDir = join(process.cwd(), config.srcDir!);

  const eta = new Eta({
    views: templateDir,
    cache: process.env.NODE_ENV === 'production',
  });

  // Add custom filters if provided
  if (config.eta?.filters) {
    Object.entries(config.eta.filters).forEach(([name, fn]) => {
      (eta as Eta & { filters: Record<string, unknown> }).filters[name] = fn;
    });
  }

  return eta;
}

export async function renderPage(
  page: PageModel,
  body: string,
  config: StatiConfig,
  eta: Eta,
  navigation?: NavNode[],
): Promise<string> {
  // Discover partials for this page's directory hierarchy
  const srcDir = join(process.cwd(), config.srcDir!);
  const relativePath = relative(srcDir, page.sourcePath);
  const partials = await discoverPartials(relativePath, config);

  // Discover the appropriate layout using hierarchical layout.eta convention
  const layoutPath = await discoverLayout(relativePath, config, page.frontMatter.layout);

  const context = {
    site: config.site,
    page: {
      ...page.frontMatter,
      path: page.url,
      content: body,
    },
    content: body,
    navigation: navigation || [],
    partials, // Add discovered partials to template context
  };

  try {
    if (!layoutPath) {
      console.warn('No layout template found, using fallback');
      return createFallbackHtml(page, body);
    }

    return await eta.renderAsync(layoutPath, context);
  } catch (error) {
    console.error(`Error rendering layout ${layoutPath || 'unknown'}:`, error);
    return createFallbackHtml(page, body);
  }
}

function createFallbackHtml(page: PageModel, body: string): string {
  const title = page.frontMatter.title || 'Untitled';
  const description = page.frontMatter.description || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]!);
}
