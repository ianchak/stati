import {
  readFile,
  writeFile,
  pathExists,
  ensureDir,
  createFallbackLogger,
} from '../utils/index.js';
import { join } from 'node:path';
import type { CacheManifest, CacheEntry, Logger } from '../../types/index.js';
import { MANIFEST_FILENAME } from '../../constants.js';
import { parseCacheEntry } from './entry.js';
import { createStaleEntry } from './stale.js';

/**
 * Cache keys of page entries in manifest text that is not valid JSON, such as `"/about.html": {`.
 * Only entry keys have this form: the other objects hold fixed field names or stylesheet paths.
 */
const ENTRY_KEY_PATTERN = /"(\/[^"\\]*\.html)"\s*:\s*\{/g;

/**
 * Reads the cache keys of page entries out of a damaged manifest, such as one cut short by a
 * crash while it was written.
 *
 * @param manifestContent - The text of the manifest
 * @returns A manifest with a stale entry per key found, or null when there is none
 */
function recoverStaleEntries(manifestContent: string): CacheManifest | null {
  const entries: Record<string, CacheEntry> = {};
  for (const match of manifestContent.matchAll(ENTRY_KEY_PATTERN)) {
    const key = match[1]!;
    entries[key] = createStaleEntry(key);
  }
  return Object.keys(entries).length > 0 ? { entries } : null;
}

/**
 * Type for Node.js errno exceptions
 */
interface NodeError extends Error {
  code?: string;
}

/**
 * Loads the ISG cache manifest from the cache directory.
 * Returns null if no manifest exists or if it's corrupted.
 * Provides detailed error reporting for different failure scenarios.
 *
 * Each entry is checked with {@link parseCacheEntry}. An invalid one is reset to a stale entry
 * with a warning, so its page renders again.
 *
 * @param cacheDir - Path to the .stati cache directory
 * @param logger - Where warnings go; the console when omitted
 * @returns Promise resolving to the cache manifest or null
 *
 * @example
 * ```typescript
 * const manifest = await loadCacheManifest('.stati', logger);
 * if (manifest) {
 *   logger.info(`Found ${Object.keys(manifest.entries).length} cached entries`);
 * }
 * ```
 */
export async function loadCacheManifest(
  cacheDir: string,
  logger: Logger = createFallbackLogger(),
): Promise<CacheManifest | null> {
  const manifestPath = join(cacheDir, MANIFEST_FILENAME);

  try {
    if (!(await pathExists(manifestPath))) {
      return null;
    }

    const manifestContent = await readFile(manifestPath, 'utf-8');

    if (!manifestContent) {
      logger.warning('Cache manifest not found or empty, creating new cache');
      return null;
    }

    // Handle empty files
    if (!manifestContent.trim()) {
      logger.warning('Cache manifest is empty, creating new cache');
      return null;
    }

    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestContent);
    } catch (parseError) {
      logger.warning(
        `Cache manifest contains invalid JSON, ignoring existing cache. ` +
          `Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      // The pages it lists still have output that pruning must be able to find
      return recoverStaleEntries(manifestContent);
    }

    // Detailed validation of manifest structure
    if (!manifest || typeof manifest !== 'object') {
      logger.warning('Cache manifest is not an object, ignoring existing cache');
      return null;
    }

    const manifestObj = manifest as Record<string, unknown>;

    if (!manifestObj.entries) {
      logger.warning('Cache manifest missing "entries" field, ignoring existing cache');
      return null;
    }

    if (typeof manifestObj.entries !== 'object' || Array.isArray(manifestObj.entries)) {
      logger.warning('Cache manifest "entries" field is not an object, ignoring existing cache');
      return null;
    }

    // Validate individual cache entries. An invalid one is reset, not dropped: its key still
    // names the page's output file, which pruning needs to delete the file once the page is gone
    const entries = manifestObj.entries as Record<string, unknown>;
    const validatedEntries: Record<string, CacheEntry> = {};
    let invalidEntryCount = 0;

    for (const [path, entry] of Object.entries(entries)) {
      const parsed = parseCacheEntry(entry);
      if ('reason' in parsed) {
        logger.warning(`Invalid cache entry for ${path}: ${parsed.reason}`);
        validatedEntries[path] = createStaleEntry(path);
        invalidEntryCount++;
      } else {
        validatedEntries[path] = parsed;
      }
    }

    if (invalidEntryCount > 0) {
      logger.warning(`Reset ${invalidEntryCount} invalid cache entries`);
    }

    // Return manifest with entries AND navigationHash (if present)
    const resultManifest: CacheManifest = { entries: validatedEntries };

    // Preserve navigationHash if it exists
    if (typeof manifestObj.navigationHash === 'string') {
      resultManifest.navigationHash = manifestObj.navigationHash;
    }

    // The stylesheet paths cached pages link, which the next build rewrites when they change
    const stylesheets = manifestObj.stylesheets;
    if (
      stylesheets &&
      typeof stylesheets === 'object' &&
      !Array.isArray(stylesheets) &&
      Object.values(stylesheets).every((path) => typeof path === 'string')
    ) {
      resultManifest.stylesheets = stylesheets as Record<string, string>;
    }

    return resultManifest;
  } catch (error) {
    // pathExists and readFile wrap file system errors in one that names the path and the cause,
    // such as EACCES, and readFile returns null for a missing file
    logger.warning(
      `Failed to load cache manifest: ${error instanceof Error ? error.message : String(error)}. ` +
        `Starting with fresh cache.`,
    );
    return null;
  }
}

/**
 * Saves the ISG cache manifest to the cache directory.
 * Creates the cache directory if it doesn't exist.
 * Provides detailed error handling for common file system issues.
 *
 * @param cacheDir - Path to the .stati cache directory
 * @param manifest - The cache manifest to save
 * @throws {Error} If the manifest cannot be saved
 *
 * @example
 * ```typescript
 * const manifest: CacheManifest = { entries: {} };
 * await saveCacheManifest('.stati', manifest);
 * ```
 */
export async function saveCacheManifest(cacheDir: string, manifest: CacheManifest): Promise<void> {
  const manifestPath = join(cacheDir, MANIFEST_FILENAME);

  try {
    // Ensure cache directory exists
    await ensureDir(cacheDir);

    // Save manifest with pretty formatting for debugging
    const manifestContent = JSON.stringify(manifest, null, 2);
    await writeFile(manifestPath, manifestContent, 'utf-8');
  } catch (error) {
    const nodeError = error as NodeError;

    // Handle specific error codes with custom messages
    if (
      nodeError.code === 'EACCES' ||
      (nodeError.message && nodeError.message.includes('Permission denied'))
    ) {
      throw new Error(
        `Permission denied saving cache manifest to ${manifestPath}. ` +
          `Please check directory permissions or run with appropriate privileges.`,
        { cause: error },
      );
    }

    if (
      nodeError.code === 'ENOSPC' ||
      (nodeError.message && nodeError.message.includes('No space left on device'))
    ) {
      throw new Error(
        `No space left on device when saving cache manifest to ${manifestPath}. ` +
          `Please free up disk space and try again.`,
        { cause: error },
      );
    }

    if (nodeError.code === 'EMFILE' || nodeError.code === 'ENFILE') {
      throw new Error(
        `Too many open files when saving cache manifest. ` +
          `Consider reducing concurrent operations or increasing file descriptor limits.`,
        { cause: error },
      );
    }

    if (nodeError.code === 'ENOTDIR') {
      throw new Error(
        `Cache directory path ${cacheDir} is not a directory. ` +
          `Please remove the conflicting file and try again.`,
        { cause: error },
      );
    }

    // Re-throw the original error if it's already properly formatted
    if (error instanceof Error) {
      if (
        error.message.includes('Failed to create directory') ||
        error.message.includes('Failed to write file')
      ) {
        throw new Error(
          `Failed to save cache manifest to ${manifestPath}: ${error.message.split(': ').slice(-1)[0]}`,
          { cause: error },
        );
      }
      if (error.message.includes('Failed to')) {
        throw error;
      }
    }

    throw new Error(
      `Failed to save cache manifest to ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

/**
 * Creates an empty cache manifest with no entries.
 *
 * @returns A new empty cache manifest
 *
 * @example
 * ```typescript
 * const manifest = createEmptyManifest();
 * console.log(Object.keys(manifest.entries).length); // 0
 * ```
 */
export function createEmptyManifest(): CacheManifest {
  return {
    entries: {},
  };
}
