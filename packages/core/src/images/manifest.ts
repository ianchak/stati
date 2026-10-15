/**
 * The images manifest, `.stati/images/manifest.json`: which files each image job produced,
 * and cached hashes and probes of source images.
 * @module images/manifest
 */

import { join } from 'node:path';
import { ensureDir, readFile, writeFile } from '../core/utils/index.js';
import { IMAGES_CACHE_SUBDIR, MANIFEST_FILENAME } from '../constants.js';
import type { SourceInfo } from './sources.js';

/** Bumped when the manifest layout changes; older manifests are discarded. */
const IMAGES_MANIFEST_VERSION = 1;

/**
 * Persisted state of the image pipeline.
 */
export interface ImagesManifest {
  version: number;
  /** Cached facts about source images, keyed by absolute path */
  sources: Record<string, SourceInfo>;
  /** Files each job wrote, relative to the output directory, keyed by job key */
  outputs: Record<string, { files: string[] }>;
}

/**
 * Creates an empty images manifest.
 */
export function createEmptyImagesManifest(): ImagesManifest {
  return { version: IMAGES_MANIFEST_VERSION, sources: {}, outputs: {} };
}

/**
 * Path of the images manifest inside the cache directory.
 */
export function getImagesManifestPath(cacheDir: string): string {
  return join(cacheDir, IMAGES_CACHE_SUBDIR, MANIFEST_FILENAME);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Loads the images manifest. A missing, unreadable or outdated manifest yields an empty one,
 * which only means images are checked again.
 */
export async function loadImagesManifest(cacheDir: string): Promise<ImagesManifest> {
  try {
    const content = await readFile(getImagesManifestPath(cacheDir));
    if (!content) return createEmptyImagesManifest();

    const parsed = JSON.parse(content) as Partial<ImagesManifest>;
    if (
      parsed?.version !== IMAGES_MANIFEST_VERSION ||
      typeof parsed.sources !== 'object' ||
      typeof parsed.outputs !== 'object'
    ) {
      return createEmptyImagesManifest();
    }

    const outputs: ImagesManifest['outputs'] = {};
    for (const [key, record] of Object.entries(parsed.outputs ?? {})) {
      if (record && isStringArray(record.files)) {
        outputs[key] = { files: record.files };
      }
    }

    const sources: ImagesManifest['sources'] = {};
    for (const [path, info] of Object.entries(parsed.sources ?? {})) {
      if (
        info &&
        typeof info.size === 'number' &&
        typeof info.mtimeMs === 'number' &&
        typeof info.hash === 'string'
      ) {
        sources[path] = info;
      }
    }

    return { version: IMAGES_MANIFEST_VERSION, sources, outputs };
  } catch {
    return createEmptyImagesManifest();
  }
}

/**
 * Saves the images manifest.
 */
export async function saveImagesManifest(
  cacheDir: string,
  manifest: ImagesManifest,
): Promise<void> {
  const path = getImagesManifestPath(cacheDir);
  await ensureDir(join(cacheDir, IMAGES_CACHE_SUBDIR));
  await writeFile(path, JSON.stringify(manifest, null, 2), 'utf-8');
}
