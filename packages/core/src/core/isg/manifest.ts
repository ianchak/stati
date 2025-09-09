import fse from 'fs-extra';
const { readFile, writeFile, pathExists, ensureDir } = fse;
import { join } from 'path';
import type { CacheManifest } from '../../types.js';

/**
 * Path to the cache manifest file within the cache directory
 */
const MANIFEST_FILENAME = 'manifest.json';

/**
 * Loads the ISG cache manifest from the cache directory.
 * Returns null if no manifest exists or if it's corrupted.
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
    const manifest = JSON.parse(manifestContent) as CacheManifest;

    // Basic validation - ensure it has the expected structure
    if (!manifest || typeof manifest !== 'object' || !manifest.entries) {
      console.warn('Cache manifest is corrupted, ignoring existing cache');
      return null;
    }

    return manifest;
  } catch (error) {
    console.warn(
      `Failed to load cache manifest: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Saves the ISG cache manifest to the cache directory.
 * Creates the cache directory if it doesn't exist.
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
    throw new Error(
      `Failed to save cache manifest: ${error instanceof Error ? error.message : String(error)}`,
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
