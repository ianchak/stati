import { dirname, resolve } from 'node:path';
import type { CacheManifest } from '../../types/index.js';
import {
  isPathWithinDirectory,
  lstat,
  pathExists,
  readdir,
  realpath,
  remove,
  stat,
} from '../utils/index.js';

/**
 * Result of {@link pruneOrphanedPages}.
 */
export interface PruneResult {
  /** Cache keys whose output file was deleted */
  removed: string[];
  /** Output files that could not be deleted, with the reason */
  failed: Array<{ key: string; message: string }>;
}

/**
 * Removes the output of pages that no longer exist, such as a deleted post or a tag that no
 * post uses anymore.
 *
 * Every manifest entry whose cache key is not one of this build's pages is an orphan: its
 * HTML file is deleted, then its entry is dropped from the manifest, and so are the folders
 * that deleting it leaves empty. Only files the manifest records are deleted, so files from
 * the static directory or from other tools in the output directory stay. Nothing is deleted
 * outside the output directory, including through a folder that links to somewhere else.
 *
 * @param manifest - The cache manifest; orphaned entries are removed from it, except those
 *   whose file could not be deleted, so the next build tries again
 * @param liveKeys - Cache keys of this build's pages, rendered or served from the cache
 * @param outDir - The output directory
 * @returns The deleted outputs and the ones that could not be deleted
 */
export async function pruneOrphanedPages(
  manifest: CacheManifest,
  liveKeys: ReadonlySet<string>,
  outDir: string,
): Promise<PruneResult> {
  const result: PruneResult = { removed: [], failed: [] };
  const outRoot = resolve(outDir);
  let realRoot: string | undefined;

  for (const key of Object.keys(manifest.entries)) {
    if (liveKeys.has(key)) {
      continue;
    }

    // Cache keys are output paths relative to the output directory, such as /blog/post.html
    const relativePath = key.replace(/^\/+/, '');
    const outputPath = resolve(outRoot, relativePath);
    let removed = false;
    try {
      if (
        relativePath.endsWith('.html') &&
        outputPath !== outRoot &&
        isPathWithinDirectory(outRoot, outputPath) &&
        (await pathExists(outputPath)) &&
        (await stat(outputPath)).isFile()
      ) {
        // Resolves links, so a folder linked to somewhere outside is left alone
        realRoot ??= await realpath(outRoot);
        if (isPathWithinDirectory(realRoot, await realpath(dirname(outputPath)))) {
          await remove(outputPath);
          removed = true;
        }
      }
    } catch (error) {
      // The entry stays, so the next build tries again
      result.failed.push({ key, message: error instanceof Error ? error.message : String(error) });
      continue;
    }
    delete manifest.entries[key];

    if (removed) {
      result.removed.push(key);
      try {
        await removeEmptyFolders(dirname(outputPath), outRoot);
      } catch {
        // An empty folder left behind does no harm
      }
    }
  }

  return result;
}

/**
 * Deletes a folder and its parents while they are empty, stopping at the output directory
 * and at links, which stay even when the folder they point to is empty.
 */
async function removeEmptyFolders(folder: string, outRoot: string): Promise<void> {
  let current = folder;
  while (current !== outRoot && isPathWithinDirectory(outRoot, current)) {
    if ((await lstat(current)).isSymbolicLink() || (await readdir(current)).length > 0) {
      return;
    }
    await remove(current);
    current = dirname(current);
  }
}
