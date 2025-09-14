import { readFile, writeFile, pathExists, ensureDir } from '../utils/fs.js';
import { join } from 'path';
import type { CacheManifest, CacheEntry } from '../../types.js';
import { MANIFEST_FILENAME } from '../../constants.js';

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
 * @param cacheDir - Path to the .stati cache directory
 * @returns Promise resolving to the cache manifest or null
 *
 * @example
 * ```typescript
 * const manifest = await loadCacheManifest('.stati');
 * if (manifest) {
 *   console.log(`Found ${Object.keys(manifest.entries).length} cached entries`);
 * }
 * ```
 */
export async function loadCacheManifest(cacheDir: string): Promise<CacheManifest | null> {
  const manifestPath = join(cacheDir, MANIFEST_FILENAME);

  try {
    if (!(await pathExists(manifestPath))) {
      return null;
    }

    const manifestContent = await readFile(manifestPath, 'utf-8');

    if (!manifestContent) {
      console.warn('Cache manifest not found or empty, creating new cache');
      return null;
    }

    // Handle empty files
    if (!manifestContent.trim()) {
      console.warn('Cache manifest is empty, creating new cache');
      return null;
    }

    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestContent);
    } catch (parseError) {
      console.warn(
        `Cache manifest contains invalid JSON, ignoring existing cache. ` +
          `Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      return null;
    }

    // Detailed validation of manifest structure
    if (!manifest || typeof manifest !== 'object') {
      console.warn('Cache manifest is not an object, ignoring existing cache');
      return null;
    }

    const manifestObj = manifest as Record<string, unknown>;

    if (!manifestObj.entries) {
      console.warn('Cache manifest missing "entries" field, ignoring existing cache');
      return null;
    }

    if (typeof manifestObj.entries !== 'object' || Array.isArray(manifestObj.entries)) {
      console.warn('Cache manifest "entries" field is not an object, ignoring existing cache');
      return null;
    }

    // Validate individual cache entries
    const entries = manifestObj.entries as Record<string, unknown>;
    const validatedEntries: Record<string, CacheEntry> = {};
    let invalidEntryCount = 0;

    for (const [path, entry] of Object.entries(entries)) {
      if (validateCacheEntry(entry, path)) {
        validatedEntries[path] = entry as CacheEntry;
      } else {
        invalidEntryCount++;
      }
    }

    if (invalidEntryCount > 0) {
      console.warn(`Removed ${invalidEntryCount} invalid cache entries`);
    }

    return { entries: validatedEntries };
  } catch (error) {
    const nodeError = error as NodeError;
    if (nodeError.code === 'ENOENT') {
      return null; // File doesn't exist, this is normal
    }
    if (nodeError.code === 'EACCES') {
      console.error(
        `Permission denied reading cache manifest at ${manifestPath}. ` +
          `Please check file permissions or run with appropriate privileges.`,
      );
      return null;
    }
    if (nodeError.code === 'EMFILE' || nodeError.code === 'ENFILE') {
      console.error(
        `Too many open files when reading cache manifest. ` +
          `Consider reducing concurrent operations or increasing file descriptor limits.`,
      );
      return null;
    }

    console.warn(
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
      );
    }

    if (
      nodeError.code === 'ENOSPC' ||
      (nodeError.message && nodeError.message.includes('No space left on device'))
    ) {
      throw new Error(
        `No space left on device when saving cache manifest to ${manifestPath}. ` +
          `Please free up disk space and try again.`,
      );
    }

    if (nodeError.code === 'EMFILE' || nodeError.code === 'ENFILE') {
      throw new Error(
        `Too many open files when saving cache manifest. ` +
          `Consider reducing concurrent operations or increasing file descriptor limits.`,
      );
    }

    if (nodeError.code === 'ENOTDIR') {
      throw new Error(
        `Cache directory path ${cacheDir} is not a directory. ` +
          `Please remove the conflicting file and try again.`,
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
        );
      }
      if (error.message.includes('Failed to')) {
        throw error;
      }
    }

    throw new Error(
      `Failed to save cache manifest to ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
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

/**
 * Validates a cache entry object to ensure it has the required structure.
 * Used when loading cache manifest to filter out corrupted entries.
 *
 * @param entry - The cache entry to validate
 * @param path - The path key for error context
 * @returns True if the entry is valid, false otherwise
 */
function validateCacheEntry(entry: unknown, path: string): entry is CacheEntry {
  if (!entry || typeof entry !== 'object') {
    console.warn(`Invalid cache entry for ${path}: not an object`);
    return false;
  }

  const entryObj = entry as Record<string, unknown>;

  // Check required fields
  const requiredFields = ['path', 'inputsHash', 'deps', 'tags', 'renderedAt', 'ttlSeconds'];
  for (const field of requiredFields) {
    if (!(field in entryObj)) {
      console.warn(`Invalid cache entry for ${path}: missing required field "${field}"`);
      return false;
    }
  }

  // Validate field types
  if (typeof entryObj.path !== 'string') {
    console.warn(`Invalid cache entry for ${path}: "path" must be a string`);
    return false;
  }

  if (typeof entryObj.inputsHash !== 'string') {
    console.warn(`Invalid cache entry for ${path}: "inputsHash" must be a string`);
    return false;
  }

  if (!Array.isArray(entryObj.deps)) {
    console.warn(`Invalid cache entry for ${path}: "deps" must be an array`);
    return false;
  }

  if (!Array.isArray(entryObj.tags)) {
    console.warn(`Invalid cache entry for ${path}: "tags" must be an array`);
    return false;
  }

  if (typeof entryObj.renderedAt !== 'string') {
    console.warn(`Invalid cache entry for ${path}: "renderedAt" must be a string`);
    return false;
  }

  if (typeof entryObj.ttlSeconds !== 'number') {
    console.warn(`Invalid cache entry for ${path}: "ttlSeconds" must be a number`);
    return false;
  }

  // Validate optional fields if present
  if (entryObj.publishedAt !== undefined && typeof entryObj.publishedAt !== 'string') {
    console.warn(`Invalid cache entry for ${path}: "publishedAt" must be a string if present`);
    return false;
  }

  if (entryObj.maxAgeCapDays !== undefined && typeof entryObj.maxAgeCapDays !== 'number') {
    console.warn(`Invalid cache entry for ${path}: "maxAgeCapDays" must be a number if present`);
    return false;
  }

  // Validate that deps and tags arrays contain strings
  if (!entryObj.deps.every((dep: unknown) => typeof dep === 'string')) {
    console.warn(`Invalid cache entry for ${path}: all "deps" must be strings`);
    return false;
  }

  if (!entryObj.tags.every((tag: unknown) => typeof tag === 'string')) {
    console.warn(`Invalid cache entry for ${path}: all "tags" must be strings`);
    return false;
  }

  // Validate date format for renderedAt
  if (isNaN(new Date(entryObj.renderedAt as string).getTime())) {
    console.warn(`Invalid cache entry for ${path}: "renderedAt" is not a valid date`);
    return false;
  }

  // Validate date format for publishedAt if present
  if (entryObj.publishedAt && isNaN(new Date(entryObj.publishedAt as string).getTime())) {
    console.warn(`Invalid cache entry for ${path}: "publishedAt" is not a valid date`);
    return false;
  }

  return true;
}
