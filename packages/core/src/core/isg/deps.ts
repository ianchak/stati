import { join, dirname, relative } from 'path';
import fse from 'fs-extra';
const { pathExists } = fse;
import glob from 'fast-glob';
import type { PageModel, StatiConfig } from '../../types.js';

/**
 * Tracks all template dependencies for a given page.
 * This includes the layout file and all accessible partials.
 *
 * @param page - The page model to track dependencies for
 * @param config - Stati configuration
 * @returns Array of absolute paths to dependency files
 *
 * @example
 * ```typescript
 * const deps = await trackTemplateDependencies(page, config);
 * console.log(`Page depends on ${deps.length} template files`);
 * ```
 */
export async function trackTemplateDependencies(
  page: PageModel,
  config: StatiConfig,
): Promise<string[]> {
  // Early return if required config values are missing
  if (!config.srcDir) {
    console.warn('Config srcDir is missing, cannot track template dependencies');
    return [];
  }

  const deps: string[] = [];
  const srcDir = join(process.cwd(), config.srcDir);
  const relativePath = relative(srcDir, page.sourcePath);

  // 1. Find the layout file that will be used for this page
  const layoutPath = await discoverLayout(
    relativePath,
    config,
    page.frontMatter.layout as string | undefined,
    isCollectionIndexPage(page),
  );

  if (layoutPath) {
    const absoluteLayoutPath = join(srcDir, layoutPath);
    deps.push(absoluteLayoutPath);
  }

  // 2. Find all partials accessible to this page
  const partialDeps = await findPartialDependencies(relativePath, config);
  deps.push(...partialDeps);

  return deps;
}

/**
 * Finds all partial dependencies for a given page path.
 * Searches up the directory hierarchy for _* folders containing .eta files.
 *
 * @param pagePath - Relative path to the page from srcDir
 * @param config - Stati configuration
 * @returns Array of absolute paths to partial files
 *
 * @example
 * ```typescript
 * const partials = await findPartialDependencies('blog/post.md', config);
 * ```
 */
export async function findPartialDependencies(
  pagePath: string,
  config: StatiConfig,
): Promise<string[]> {
  // Early return if required config values are missing
  if (!config.srcDir) {
    console.warn('Config srcDir is missing, cannot find partial dependencies');
    return [];
  }

  const deps: string[] = [];
  const srcDir = join(process.cwd(), config.srcDir);

  // Get the directory of the current page
  const pageDir = dirname(pagePath);
  const pathSegments = pageDir === '.' ? [] : pageDir.split(/[/\\]/);

  // Build list of directories to search (current dir up to root)
  const dirsToSearch: string[] = [];

  // Add directories from current up to root
  if (pathSegments.length > 0) {
    for (let i = pathSegments.length; i >= 0; i--) {
      if (i === 0) {
        dirsToSearch.push(''); // Root directory
      } else {
        dirsToSearch.push(pathSegments.slice(0, i).join('/'));
      }
    }
  } else {
    dirsToSearch.push(''); // Root directory only
  }

  // Search each directory for _* folders containing .eta files
  for (const dir of dirsToSearch) {
    const searchDir = dir ? join(srcDir, dir) : srcDir;

    try {
      // Find all .eta files in _* subdirectories
      const pattern = join(searchDir, '_*/**/*.eta').replace(/\\/g, '/');
      const partialFiles = await glob(pattern, { absolute: true });

      deps.push(...partialFiles);
    } catch {
      // Continue if directory doesn't exist or can't be read
      continue;
    }
  }

  return deps;
}

/**
 * Resolves a template name to its file path.
 * Used for explicit layout specifications in front matter.
 *
 * @param layout - Layout name (without .eta extension)
 * @param config - Stati configuration
 * @returns Absolute path to template file, or null if not found
 *
 * @example
 * ```typescript
 * const templatePath = await resolveTemplatePath('post', config);
 * if (templatePath) {
 *   console.log(`Found template at: ${templatePath}`);
 * }
 * ```
 */
export async function resolveTemplatePath(
  layout: string,
  config: StatiConfig,
): Promise<string | null> {
  const srcDir = join(process.cwd(), config.srcDir!);
  const layoutPath = join(srcDir, `${layout}.eta`);

  if (await pathExists(layoutPath)) {
    return layoutPath;
  }

  return null;
}

/**
 * Helper function to determine if a page is a collection index page.
 * Duplicated from templates.ts to avoid circular dependencies.
 */
function isCollectionIndexPage(page: PageModel): boolean {
  // This is a simplified version - in a real implementation,
  // we'd need access to all pages to determine this properly.
  // For now, we'll assume any page ending in /index or at root is a collection page.
  return page.url === '/' || page.url.endsWith('/index') || page.slug === 'index';
}

/**
 * Helper function to discover layout files.
 * Duplicated from templates.ts to avoid circular dependencies.
 */
async function discoverLayout(
  pagePath: string,
  config: StatiConfig,
  explicitLayout?: string,
  isIndexPage?: boolean,
): Promise<string | null> {
  // Early return if required config values are missing
  if (!config.srcDir) {
    return null;
  }

  const srcDir = join(process.cwd(), config.srcDir);

  // If explicit layout is specified, use it
  if (explicitLayout) {
    const layoutPath = join(srcDir, `${explicitLayout}.eta`);
    if (await pathExists(layoutPath)) {
      return `${explicitLayout}.eta`;
    }
  }

  // Get the directory of the current page
  const pageDir = dirname(pagePath);
  const pathSegments = pageDir === '.' ? [] : pageDir.split(/[/\\]/);

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
    // For index pages, first check for index.eta in each directory
    if (isIndexPage) {
      const indexLayoutPath = dir ? join(srcDir, dir, 'index.eta') : join(srcDir, 'index.eta');
      if (await pathExists(indexLayoutPath)) {
        const relativePath = dir ? `${dir}/index.eta` : 'index.eta';
        return relativePath.replace(/\\/g, '/');
      }
    }

    // Then check for layout.eta as fallback
    const layoutPath = dir ? join(srcDir, dir, 'layout.eta') : join(srcDir, 'layout.eta');
    if (await pathExists(layoutPath)) {
      const relativePath = dir ? `${dir}/layout.eta` : 'layout.eta';
      return relativePath.replace(/\\/g, '/');
    }
  }

  return null;
}
