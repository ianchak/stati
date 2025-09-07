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
  const layoutName = page.frontMatter.layout || 'default';
  const layoutPath = `${layoutName}.eta`;

  // Discover partials for this page's directory hierarchy
  const srcDir = join(process.cwd(), config.srcDir!);
  const relativePath = relative(srcDir, page.sourcePath);
  const partials = await discoverPartials(relativePath, config);

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
    const templateDir = join(process.cwd(), config.srcDir!);
    const fullLayoutPath = join(templateDir, layoutPath);

    if (!(await pathExists(fullLayoutPath))) {
      console.warn(`Template not found: ${layoutPath}, using fallback`);
      return createFallbackHtml(page, body);
    }

    return await eta.renderAsync(layoutPath, context);
  } catch (error) {
    console.error(`Error rendering layout ${layoutPath}:`, error);
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
