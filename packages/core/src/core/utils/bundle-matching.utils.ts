/**
 * Bundle matching utilities for per-page TypeScript bundle targeting.
 * Determines which bundles should be included on each page based on glob patterns.
 * @module core/utils/bundle-matching
 */

import type { BundleConfig } from '../../types/config.js';
import { matchesGlob } from './glob-patterns.utils.js';

/**
 * Error thrown when bundle configuration contains duplicate bundleNames.
 */
export class DuplicateBundleNameError extends Error {
  constructor(duplicates: string[]) {
    super(
      `Duplicate bundleName(s) found in configuration: ${duplicates.join(', ')}. ` +
        'Each bundle must have a unique bundleName.',
    );
    this.name = 'DuplicateBundleNameError';
  }
}

/**
 * Validates that all bundles have unique bundleNames.
 * Throws DuplicateBundleNameError if duplicates are found.
 *
 * @param bundles - Array of bundle configurations to validate
 * @throws {DuplicateBundleNameError} When duplicate bundleNames are detected
 *
 * @example
 * ```typescript
 * validateUniqueBundleNames([
 *   { entryPoint: 'core.ts', bundleName: 'core' },
 *   { entryPoint: 'docs.ts', bundleName: 'docs' }
 * ]); // OK
 *
 * validateUniqueBundleNames([
 *   { entryPoint: 'a.ts', bundleName: 'main' },
 *   { entryPoint: 'b.ts', bundleName: 'main' }
 * ]); // Throws DuplicateBundleNameError
 * ```
 */
export function validateUniqueBundleNames(bundles: BundleConfig[]): void {
  if (!bundles || bundles.length === 0) {
    return;
  }

  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const bundle of bundles) {
    if (seen.has(bundle.bundleName)) {
      if (!duplicates.includes(bundle.bundleName)) {
        duplicates.push(bundle.bundleName);
      }
    } else {
      seen.add(bundle.bundleName);
    }
  }

  if (duplicates.length > 0) {
    throw new DuplicateBundleNameError(duplicates);
  }
}

/**
 * Compiled bundle info with resolved paths for matched bundles.
 * Used to track bundle metadata after compilation.
 */
export interface CompiledBundleInfo {
  /** The original bundle configuration */
  config: BundleConfig;
  /** The compiled bundle filename (e.g., 'core-a1b2c3d4.js') */
  filename: string;
  /** The full path to the bundle (e.g., '/_assets/core-a1b2c3d4.js') */
  path: string;
  /** The size of the compiled bundle in bytes */
  sizeInBytes?: number;
}

/**
 * Determines which bundles should be included on a specific page.
 * Filters bundles based on their include/exclude glob patterns.
 *
 * Matching logic:
 * 1. If no `include` patterns: bundle is global (matches all pages)
 * 2. If `include` patterns exist: page must match at least one pattern
 * 3. If page matches any `exclude` pattern: bundle is excluded (exclude takes precedence)
 * 4. Bundle order from config is preserved
 *
 * @param pageOutputPath - The page's output URL path (e.g., '/docs/api/hooks.html')
 * @param bundles - Array of bundle configurations to filter
 * @returns Array of bundles that match this page, in config order
 *
 * @example
 * ```typescript
 * const bundles: BundleConfig[] = [
 *   { entryPoint: 'core.ts', bundleName: 'core' }, // global
 *   { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] },
 *   { entryPoint: 'playground.ts', bundleName: 'playground', include: ['/examples/**'], exclude: ['/examples/simple/**'] }
 * ];
 *
 * matchBundlesForPage('/docs/api/hooks.html', bundles);
 * // Returns: [{ entryPoint: 'core.ts', ... }, { entryPoint: 'docs.ts', ... }]
 *
 * matchBundlesForPage('/examples/advanced/demo.html', bundles);
 * // Returns: [{ entryPoint: 'core.ts', ... }, { entryPoint: 'playground.ts', ... }]
 *
 * matchBundlesForPage('/examples/simple/basic.html', bundles);
 * // Returns: [{ entryPoint: 'core.ts', ... }] - playground excluded
 * ```
 */
export function matchBundlesForPage(
  pageOutputPath: string,
  bundles: BundleConfig[],
): BundleConfig[] {
  if (!bundles || bundles.length === 0) {
    return [];
  }

  // Normalize path to use forward slashes
  const normalizedPath = pageOutputPath.replace(/\\/g, '/');

  return bundles.filter((bundle) => {
    // Check exclude patterns first (they take precedence)
    if (bundle.exclude && bundle.exclude.length > 0) {
      const matchesExclude = bundle.exclude.some((pattern) => matchesGlob(normalizedPath, pattern));
      if (matchesExclude) {
        return false;
      }
    }

    // If no include patterns, bundle is global (matches all pages)
    if (!bundle.include || bundle.include.length === 0) {
      return true;
    }

    // Check if page matches any include pattern
    return bundle.include.some((pattern) => matchesGlob(normalizedPath, pattern));
  });
}

/**
 * Gets bundle paths for a page from compiled bundle info.
 * Filters compiled bundles based on page matching and returns only the paths.
 *
 * @param pageOutputPath - The page's output URL path (e.g., '/docs/api/hooks.html')
 * @param compiledBundles - Array of compiled bundle info
 * @returns Array of bundle paths matched for this page, in config order
 *
 * @example
 * ```typescript
 * const compiled: CompiledBundleInfo[] = [
 *   { config: { entryPoint: 'core.ts', bundleName: 'core' }, filename: 'core-abc.js', path: '/_assets/core-abc.js' },
 *   { config: { entryPoint: 'docs.ts', bundleName: 'docs', include: ['/docs/**'] }, filename: 'docs-def.js', path: '/_assets/docs-def.js' }
 * ];
 *
 * getBundlePathsForPage('/docs/api/hooks.html', compiled);
 * // Returns: ['/_assets/core-abc.js', '/_assets/docs-def.js']
 * ```
 */
export function getBundlePathsForPage(
  pageOutputPath: string,
  compiledBundles: CompiledBundleInfo[],
): string[] {
  if (!compiledBundles || compiledBundles.length === 0) {
    return [];
  }

  const matchedConfigs = matchBundlesForPage(
    pageOutputPath,
    compiledBundles.map((b) => b.config),
  );

  // Map matched configs back to their paths, preserving order
  const matchedNames = new Set(matchedConfigs.map((c) => c.bundleName));
  return compiledBundles.filter((b) => matchedNames.has(b.config.bundleName)).map((b) => b.path);
}
