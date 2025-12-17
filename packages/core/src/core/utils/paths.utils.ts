import { join, posix } from 'node:path';
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

  // Use posix.normalize to clean up any '..' or '.' segments and remove redundant separators
  normalized = posix.normalize(normalized);

  // Remove trailing slash (except for root path)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}
