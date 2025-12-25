import { join, posix, resolve, sep } from 'node:path';
import type { StatiConfig } from '../../types/index.js';
import {
  DEFAULT_SRC_DIR,
  DEFAULT_OUT_DIR,
  DEFAULT_STATIC_DIR,
  CACHE_DIR_NAME,
} from '../../constants.js';

/**
 * File system path resolution utilities for Stati core.
 * Centralized utilities to ensure consistent path handling across the codebase.
 */

/**
 * Resolves the absolute source directory path from configuration.
 * @param config - Stati configuration
 * @returns Absolute path to the source directory
 */
export function resolveSrcDir(config: StatiConfig): string {
  return join(process.cwd(), config.srcDir!);
}

/**
 * Resolves the absolute output directory path from configuration.
 * @param config - Stati configuration
 * @returns Absolute path to the output directory
 */
export function resolveOutDir(config: StatiConfig): string {
  return join(process.cwd(), config.outDir!);
}

/**
 * Resolves the absolute static directory path from configuration.
 * @param config - Stati configuration
 * @returns Absolute path to the static directory
 */
export function resolveStaticDir(config: StatiConfig): string {
  return join(process.cwd(), config.staticDir!);
}

/**
 * Resolves the absolute cache directory path.
 * @returns Absolute path to the .stati cache directory
 */
export function resolveCacheDir(): string {
  return join(process.cwd(), CACHE_DIR_NAME);
}

/**
 * Resolves paths with defaults for development mode.
 * @param config - Stati configuration
 * @returns Object with all resolved directory paths with sensible defaults
 */
export function resolveDevPaths(config: StatiConfig) {
  return {
    srcDir: join(process.cwd(), config.srcDir || DEFAULT_SRC_DIR),
    outDir: join(process.cwd(), config.outDir || DEFAULT_OUT_DIR),
    staticDir: join(process.cwd(), config.staticDir || DEFAULT_STATIC_DIR),
  };
}

/**
 * Normalizes a template path for cross-platform compatibility.
 * Ensures forward slashes are used for template engine compatibility.
 * @param templatePath - Path to normalize
 * @returns Normalized path with forward slashes
 */
export function normalizeTemplatePath(templatePath: string): string {
  return posix.normalize(templatePath.replace(/\\/g, '/'));
}

/**
 * Resolves a file path relative to the source directory.
 * @param config - Stati configuration
 * @param relativePath - Path relative to srcDir
 * @returns Absolute path
 */
export function resolveSrcPath(config: StatiConfig, relativePath: string): string {
  return join(resolveSrcDir(config), relativePath);
}

/**
 * Resolves a file path relative to the output directory.
 * @param config - Stati configuration
 * @param relativePath - Path relative to outDir
 * @returns Absolute path
 */
export function resolveOutPath(config: StatiConfig, relativePath: string): string {
  return join(resolveOutDir(config), relativePath);
}

/**
 * Resolves a file path relative to the static directory.
 * @param config - Stati configuration
 * @param relativePath - Path relative to staticDir
 * @returns Absolute path
 */
export function resolveStaticPath(config: StatiConfig, relativePath: string): string {
  return join(resolveStaticDir(config), relativePath);
}

/**
 * Normalizes a file path to absolute POSIX format for consistent comparisons.
 * Handles Windows paths, relative paths, and already-normalized paths.
 *
 * This utility ensures that paths from different sources (file watchers, cache manifest,
 * glob results) can be reliably compared even when they use different representations.
 *
 * **WARNING: This function is for STRING COMPARISON ONLY.**
 * **DO NOT use the returned path for file system operations.**
 *
 * The normalization uppercases Windows drive letters (c: → C:) for consistent
 * comparison on case-insensitive Windows file systems. However, this can break
 * file operations in case-sensitive environments like WSL or Unix systems mounted
 * on Windows. Always use the original path for actual file system operations
 * (fs.readFile, fs.writeFile, etc.).
 *
 * @param filePath - Path to normalize (can be relative or absolute, Windows or POSIX)
 * @param basePath - Optional base path to resolve relative paths against (defaults to cwd)
 * @returns Normalized absolute path with forward slashes and no trailing slashes
 *
 * @example
 * ```typescript
 * // Windows absolute path
 * normalizePathForComparison('C:\\project\\site\\layout.eta')
 * // Returns: 'C:/project/site/layout.eta'
 *
 * // Relative path
 * normalizePathForComparison('site/layout.eta', '/project')
 * // Returns: '/project/site/layout.eta'
 *
 * // Already POSIX path
 * normalizePathForComparison('/project/site/layout.eta')
 * // Returns: '/project/site/layout.eta'
 *
 * // CORRECT: Use for comparison
 * const normalized1 = normalizePathForComparison(watcherPath);
 * const normalized2 = normalizePathForComparison(cachedPath);
 * if (normalized1 === normalized2) { ... }
 *
 * // WRONG: Do not use for file operations
 * const normalized = normalizePathForComparison(filePath);
 * await fs.readFile(normalized); // BAD! Use original filePath instead
 * ```
 */
export function normalizePathForComparison(filePath: string, basePath?: string): string {
  // Convert backslashes to forward slashes for Windows compatibility
  let normalized = filePath.replace(/\\/g, '/');

  // Resolve to absolute path if relative
  // Check if path is already absolute (starts with / or drive letter)
  const isAbsolute = normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized);

  if (!isAbsolute) {
    const base = basePath || process.cwd();
    // Use the already-normalized path to avoid reintroducing backslashes
    normalized = join(base, normalized).replace(/\\/g, '/');
  }

  // Normalize Windows drive letter to uppercase for consistent comparison
  // File system is case-insensitive on Windows, but string comparison is case-sensitive
  if (/^[a-z]:/.test(normalized)) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  // Use posix.normalize to clean up any '..' or '.' segments and remove redundant separators
  normalized = posix.normalize(normalized);

  // Remove trailing slash (except for root path)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Validates that a resolved path is safely within a base directory.
 * This function prevents path traversal attacks by ensuring that a target path
 * (which may contain `..` sequences or other traversal patterns) resolves to
 * a location within the specified base directory.
 *
 * @param baseDir - The base directory that the target path must stay within
 * @param targetPath - The target path to validate (can be relative or contain `..`)
 * @returns `true` if the resolved target path is within the base directory, `false` otherwise
 *
 * @example
 * ```typescript
 * // Safe paths
 * isPathWithinDirectory('/app/dist', '/app/dist/index.html')  // true
 * isPathWithinDirectory('/app/dist', '/app/dist/pages/about.html')  // true
 *
 * // Path traversal attempts (returns false)
 * isPathWithinDirectory('/app/dist', '/app/dist/../../../etc/passwd')  // false
 * isPathWithinDirectory('/app/dist', '/../etc/passwd')  // false
 * ```
 */
export function isPathWithinDirectory(baseDir: string, targetPath: string): boolean {
  // Resolve both paths to absolute paths with all `..` and `.` resolved
  const resolvedBase = resolve(baseDir);
  const resolvedTarget = resolve(targetPath);

  // Normalize the base directory to ensure proper prefix matching
  // Adding sep ensures '/app/dist' doesn't match '/app/dist-other'
  const normalizedBase = resolvedBase.endsWith(sep) ? resolvedBase : resolvedBase + sep;

  // Check if the resolved target starts with the normalized base
  // We also allow exact match (resolvedTarget === resolvedBase) for the root
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(normalizedBase);
}
