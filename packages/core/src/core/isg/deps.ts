import { join, dirname, relative, posix } from 'node:path';
import {
  pathExists,
  readFile,
  isCollectionIndexPage,
  discoverLayout,
  resolveSrcDir,
} from '../utils/index.js';
import glob from 'fast-glob';
import type { PageModel, StatiConfig } from '../../types/index.js';
import { TEMPLATE_EXTENSION } from '../../constants.js';

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
 * Tracks template dependencies for a given page by parsing template content.
 * Only includes templates that are actually referenced (via include, layout, or stati.partials calls).
 * This provides accurate dependency tracking for ISG cache invalidation.
 *
 * The function recursively parses the layout template and all its dependencies to build
 * the complete dependency tree. This ensures that changes to unused partials don't
 * trigger unnecessary page rebuilds.
 *
 * @param page - The page model to track dependencies for
 * @param config - Stati configuration
 * @returns Array of absolute paths to actually-used template files (POSIX format)
 * @throws {CircularDependencyError} When circular dependencies are detected in templates
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
  // The visited set will contain all templates that are actually used (not just accessible)
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
    // Normalize to POSIX format for consistent manifest output across platforms
    const absoluteLayoutPath = posix.join(srcDir.replace(/\\/g, '/'), layoutPath);
    deps.push(absoluteLayoutPath);

    // Recursively traverse the template dependency tree
    // This populates 'visited' with all actually-used templates (not just accessible ones)
    await collectTemplateDependencies(absoluteLayoutPath, srcDir, visited, currentPath);
  }

  // 2. Add all actually-used templates from the visited set
  // Filter to only include underscore directories (partials/components)
  // and normalize paths to POSIX format
  for (const templatePath of visited) {
    const normalizedPath = templatePath.replace(/\\/g, '/');
    // Only add partials (files in directories starting with underscore) - layout is already added
    // Use strict pattern to match /_dirname/ where dirname starts with underscore
    if (/\/_[^/]+\//.test(normalizedPath)) {
      deps.push(normalizedPath);
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
 * Recursively collects all template dependencies by parsing template content.
 * Only includes templates that are actually referenced (not just accessible).
 * Uses DFS to traverse the dependency graph and detects circular references.
 *
 * @param templatePath - Absolute path to template file to analyze
 * @param srcDir - Source directory for resolving relative template paths
 * @param visited - Set to track all visited templates (accumulated dependencies)
 * @param currentPath - Set of templates in current DFS path (for cycle detection)
 * @throws {CircularDependencyError} When a circular dependency is detected
 */
async function collectTemplateDependencies(
  templatePath: string,
  srcDir: string,
  visited: Set<string>,
  currentPath: Set<string>,
): Promise<void> {
  // Normalize path for consistent tracking
  const normalizedPath = templatePath.replace(/\\/g, '/');

  // Check for circular dependency FIRST (before visited check)
  // A circular dependency means we're visiting a template that's already in our current DFS path
  // This must be checked before the visited check because a path in currentPath is always in visited
  if (currentPath.has(normalizedPath)) {
    const chain = [...currentPath, normalizedPath];
    throw new CircularDependencyError(
      chain,
      `Circular dependency detected in templates: ${chain.join(' -> ')}`,
    );
  }

  // Skip if already processed (but not in current path - those are handled above)
  if (visited.has(normalizedPath)) {
    return;
  }

  // Check if template file exists
  if (!(await pathExists(templatePath))) {
    return;
  }

  // Add to tracking sets
  currentPath.add(normalizedPath);
  visited.add(normalizedPath);

  try {
    // Read template content to find includes/extends
    const content = await readFile(templatePath, 'utf-8');
    if (!content) {
      return;
    }

    // Parse template to find referenced templates
    const dependencies = await parseTemplateDependencies(content, templatePath, srcDir);

    // Recursively collect dependencies
    for (const depPath of dependencies) {
      await collectTemplateDependencies(depPath, srcDir, visited, currentPath);
    }
  } catch (error) {
    // Re-throw circular dependency errors - these are fatal
    if (error instanceof CircularDependencyError) {
      throw error;
    }
    // Log warning but continue - don't fail the entire build for template parsing issues
    if (error instanceof Error) {
      console.warn(`Warning: Could not parse template ${templatePath}: ${error.message}`);
    }
  } finally {
    // Remove from current path when backtracking
    currentPath.delete(normalizedPath);
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
  const templateDir = dirname(templatePath);

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
        const resolvedPath = await resolveTemplatePathInternal(includePath, srcDir, templateDir);
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
        const resolvedPath = await resolveTemplatePathInternal(layoutPath, srcDir, templateDir);
        if (resolvedPath) {
          dependencies.push(resolvedPath);
        }
      }
    }
  }

  // Look for Stati partial patterns - both callable and non-callable
  // Callable: stati.partials.name() or stati.partials['name']()
  // Non-callable: stati.partials.name or stati.partials['name'] (used with <%~ %>)
  const partialPatterns = [
    // Callable patterns (with parentheses)
    /stati\.partials\.(\w+)\s*\(/g, // stati.partials.header(
    /stati\.partials\[['"`]([^'"`]+)['"`]\]\s*\(/g, // stati.partials['header'](

    // Non-callable patterns (without parentheses, used in <%~ stati.partials.name %>)
    // These patterns use lookaheads to distinguish between:
    //   - stati.partials.name (partial reference, should match)
    //   - stati.partials.name() (function call, should NOT match here - handled above)
    //
    // Pattern breakdown for dot notation: /stati\.partials\.(\w+)(?=\s*[%}\s]|$)(?!\s*\()/g
    //   - stati\.partials\.  : Literal "stati.partials."
    //   - (\w+)              : Capture partial name (letters, digits, underscore)
    //   - (?=\s*[%}\s]|$)    : Positive lookahead - must be followed by whitespace, %, }, or end of string
    //   - (?!\s*\()          : Negative lookahead - must NOT be followed by "(" (excludes function calls)
    /stati\.partials\.(\w+)(?=\s*[%}\s]|$)(?!\s*\()/g,

    // Pattern breakdown for bracket notation: /stati\.partials\[['"`]([^'"`]+)['"`]\](?=\s*[%}\s]|$)(?!\s*\()/g
    //   - stati\.partials\[  : Literal "stati.partials["
    //   - ['"`]              : Opening quote (single, double, or backtick)
    //   - ([^'"`]+)          : Capture partial name (any chars except quotes)
    //   - ['"`]\]            : Closing quote and bracket
    //   - (?=\s*[%}\s]|$)    : Positive lookahead - must be followed by whitespace, %, }, or end of string
    //   - (?!\s*\()          : Negative lookahead - must NOT be followed by "(" (excludes function calls)
    /stati\.partials\[['"`]([^'"`]+)['"`]\](?=\s*[%}\s]|$)(?!\s*\()/g,
  ];

  // Use a Set to avoid duplicate partial names
  const foundPartials = new Set<string>();

  for (const pattern of partialPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const partialName = match[1];
      if (partialName) {
        foundPartials.add(partialName);
      }
    }
  }

  // Resolve each unique partial name
  for (const partialName of foundPartials) {
    const partialFileName = `${partialName}${TEMPLATE_EXTENSION}`;
    const resolvedPath = await resolveTemplatePathInternal(partialFileName, srcDir, templateDir);
    if (resolvedPath) {
      dependencies.push(resolvedPath);
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
 * @param currentDir - Current directory for hierarchical search (optional)
 * @returns Absolute path to template file, or null if not found
 */
async function resolveTemplatePathInternal(
  templateRef: string,
  srcDir: string,
  currentDir?: string,
): Promise<string | null> {
  const templateName = templateRef.endsWith(TEMPLATE_EXTENSION)
    ? templateRef
    : `${templateRef}${TEMPLATE_EXTENSION}`;

  // Try absolute path from srcDir
  const absolutePath = join(srcDir, templateName);
  if (await pathExists(absolutePath)) {
    return absolutePath;
  }

  // Determine the starting directory for hierarchical search (relative to srcDir)
  const startDir = currentDir ? relative(srcDir, currentDir) : '';

  // Build list of directories to search (current dir up to srcDir root only)
  // This ensures we never search outside the source directory boundary
  const dirsToSearch: string[] = [];

  // Safety check: ensure currentDir is within srcDir (relative path shouldn't start with '..')
  if (startDir.startsWith('..')) {
    // If currentDir is outside srcDir, only search at srcDir root
    dirsToSearch.push('');
  } else {
    const pathSegments = startDir === '' ? [] : startDir.split(/[/\\]/);

    // Add directories from current up to srcDir root (don't go beyond srcDir)
    if (pathSegments.length > 0) {
      for (let i = pathSegments.length; i >= 0; i--) {
        if (i === 0) {
          dirsToSearch.push(''); // srcDir root directory
        } else {
          dirsToSearch.push(pathSegments.slice(0, i).join('/'));
        }
      }
    } else {
      dirsToSearch.push(''); // srcDir root directory only
    }
  }

  // Search each directory level for the template in underscore directories
  for (const dir of dirsToSearch) {
    const searchDir = dir ? join(srcDir, dir) : srcDir;

    try {
      // Search for template in underscore directories at this level only
      const pattern = posix.join(searchDir.replace(/\\/g, '/'), '_*', templateName);
      const matches = await glob(pattern, { absolute: true });
      if (matches.length > 0) {
        // Normalize to POSIX format for consistent cross-platform path handling
        return matches[0]!.replace(/\\/g, '/');
      }
    } catch {
      // Continue if directory doesn't exist or can't be read
      continue;
    }
  }

  return null;
}
