import { join, dirname, relative, posix } from 'path';
import { pathExists, readFile } from '../utils/fs.js';
import glob from 'fast-glob';
import type { PageModel, StatiConfig } from '../../types.js';
import { isCollectionIndexPage, discoverLayout } from '../utils/template-discovery.js';
import { resolveSrcDir } from '../utils/paths.js';

/**
 * Error thrown when a circular dependency is detected in templates.
 */
export class CircularDependencyError extends Error {
  constructor(
    public readonly dependencyChain: string[],
    message: string,
  ) {
    super(message);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Tracks all template dependencies for a given page.
 * This includes the layout file and all accessible partials.
 * Includes circular dependency detection.
 *
 * @param page - The page model to track dependencies for
 * @param config - Stati configuration
 * @returns Array of absolute paths to dependency files
 * @throws {CircularDependencyError} When circular dependencies are detected
 *
 * @example
 * ```typescript
 * try {
 *   const deps = await trackTemplateDependencies(page, config);
 *   console.log(`Page depends on ${deps.length} template files`);
 * } catch (error) {
 *   if (error instanceof CircularDependencyError) {
 *     console.error(`Circular dependency: ${error.dependencyChain.join(' -> ')}`);
 *   }
 * }
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
  const srcDir = resolveSrcDir(config);
  const relativePath = relative(srcDir, page.sourcePath);

  // Track dependencies with circular detection
  const visited = new Set<string>();
  const currentPath = new Set<string>();

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

    // Check for circular dependencies in layout chain
    await detectCircularDependencies(absoluteLayoutPath, srcDir, visited, currentPath);
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
  const srcDir = resolveSrcDir(config);

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
      // Use posix.join to ensure forward slashes for glob patterns
      const normalizedSearchDir = searchDir.replace(/\\/g, '/');
      const pattern = posix.join(normalizedSearchDir, '_*/**/*.eta');
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
  const srcDir = resolveSrcDir(config);
  const layoutPath = join(srcDir, `${layout}.eta`);

  if (await pathExists(layoutPath)) {
    return layoutPath;
  }

  return null;
}

/**
 * Detects circular dependencies in template includes/extends.
 * Uses DFS to traverse the dependency graph and detect cycles.
 *
 * @param templatePath - Absolute path to template file to check
 * @param srcDir - Source directory for resolving relative template paths
 * @param visited - Set of all visited template paths (for optimization)
 * @param currentPath - Set of templates in current DFS path (for cycle detection)
 * @throws {CircularDependencyError} When a circular dependency is detected
 */
async function detectCircularDependencies(
  templatePath: string,
  srcDir: string,
  visited: Set<string>,
  currentPath: Set<string>,
): Promise<void> {
  // Skip if already processed
  if (visited.has(templatePath)) {
    return;
  }

  // Check for circular dependency
  if (currentPath.has(templatePath)) {
    const chain = Array.from(currentPath);
    chain.push(templatePath);
    throw new CircularDependencyError(
      chain,
      `Circular dependency detected in templates: ${chain.join(' -> ')}`,
    );
  }

  // Check if template file exists
  if (!(await pathExists(templatePath))) {
    // Don't treat missing files as circular dependencies
    // They will be handled by the missing file error handling
    return;
  }

  // Add to current path
  currentPath.add(templatePath);
  visited.add(templatePath);

  try {
    // Read template content to find includes/extends
    const content = await readFile(templatePath, 'utf-8');
    if (!content) {
      return; // Skip if file doesn't exist
    }
    const dependencies = await parseTemplateDependencies(content, templatePath, srcDir);

    // Recursively check dependencies
    for (const depPath of dependencies) {
      await detectCircularDependencies(depPath, srcDir, visited, currentPath);
    }
  } catch (error) {
    // If we can't read the file, don't treat it as a circular dependency
    if (error instanceof Error && !error.message.includes('Circular dependency')) {
      console.warn(`Warning: Could not read template ${templatePath}: ${error.message}`);
    } else {
      throw error; // Re-throw circular dependency errors
    }
  } finally {
    // Remove from current path when backtracking
    currentPath.delete(templatePath);
  }
}

/**
 * Parses a template file to find included/extended templates.
 * This is a basic implementation that looks for common Eta patterns.
 *
 * @param content - Template file content
 * @param templatePath - Path to the template file (for error context)
 * @param srcDir - Source directory for resolving relative paths
 * @returns Array of absolute paths to dependent templates
 */
async function parseTemplateDependencies(
  content: string,
  templatePath: string,
  srcDir: string,
): Promise<string[]> {
  const dependencies: string[] = [];

  // Look for Eta include patterns: <%~ include('template') %>
  const includePatterns = [
    /<%[~-]?\s*include\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /<%[~-]?\s*include\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g, // with parameters
  ];

  for (const pattern of includePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const includePath = match[1];
      if (includePath) {
        const resolvedPath = await resolveTemplatePathInternal(includePath, srcDir);
        if (resolvedPath) {
          dependencies.push(resolvedPath);
        }
      }
    }
  }

  // Look for Eta layout/extends patterns: <%~ layout('template') %>
  const layoutPatterns = [
    /<%[~-]?\s*layout\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /<%[~-]?\s*extends?\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  ];

  for (const pattern of layoutPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const layoutPath = match[1];
      if (layoutPath) {
        const resolvedPath = await resolveTemplatePathInternal(layoutPath, srcDir);
        if (resolvedPath) {
          dependencies.push(resolvedPath);
        }
      }
    }
  }

  return dependencies;
}

/**
 * Internal helper to resolve template paths (renamed to avoid naming conflict).
 * Handles relative paths and adds .eta extension if needed.
 *
 * @param templateRef - Template reference from include/layout statement
 * @param srcDir - Source directory for resolving paths
 * @returns Absolute path to template file, or null if not found
 */
async function resolveTemplatePathInternal(
  templateRef: string,
  srcDir: string,
): Promise<string | null> {
  // Add .eta extension if not present
  const templateName = templateRef.endsWith('.eta') ? templateRef : `${templateRef}.eta`;

  // Try absolute path from srcDir
  const absolutePath = join(srcDir, templateName);
  if (await pathExists(absolutePath)) {
    return absolutePath;
  }

  // Try resolving relative to template directories
  // This is a simplified version - real implementation might need more sophisticated resolution
  const possiblePaths = [
    join(srcDir, '_templates', templateName),
    join(srcDir, '_partials', templateName),
    join(srcDir, '_layouts', templateName),
  ];

  for (const path of possiblePaths) {
    if (await pathExists(path)) {
      return path;
    }
  }

  return null;
}
