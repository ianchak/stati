/**
 * Content hashes and probe results for source images, cached by file size and
 * modification time so unchanged photos are not read again.
 * @module images/sources
 */

import { createHash } from 'node:crypto';
import {
  readFileBuffer,
  readFileBufferSync,
  stat,
  statSyncOrNull,
  pathExists,
} from '../core/utils/index.js';
import { probeImage } from './utils/index.js';
import type { ImageProbeResult } from './utils/index.js';

/**
 * Cached facts about one source image.
 */
export interface SourceInfo {
  /** File size in bytes when inspected */
  size: number;
  /** Modification time when inspected */
  mtimeMs: number;
  /** SHA-256 of the file bytes, hex */
  hash: string;
  /** Header probe, or null for formats Stati cannot read */
  probe: ImageProbeResult | null;
}

/** Keyed by absolute path with forward slashes. */
const sourceCache = new Map<string, SourceInfo>();

function cacheKey(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function inspectBytes(bytes: Buffer, size: number, mtimeMs: number): SourceInfo {
  return {
    size,
    mtimeMs,
    hash: createHash('sha256').update(bytes).digest('hex'),
    probe: probeImage(bytes),
  };
}

function isCurrent(info: SourceInfo | undefined, size: number, mtimeMs: number): boolean {
  return info !== undefined && info.size === size && info.mtimeMs === mtimeMs;
}

/**
 * Inspects a source image synchronously, for template helpers that cannot await.
 *
 * @param filePath - Absolute path of the image
 * @returns Facts about the image, or null if it does not exist
 */
export function inspectSourceSync(filePath: string): SourceInfo | null {
  const stats = statSyncOrNull(filePath);
  if (!stats || !stats.isFile()) return null;

  const key = cacheKey(filePath);
  const cached = sourceCache.get(key);
  if (isCurrent(cached, stats.size, stats.mtimeMs)) return cached!;

  const bytes = readFileBufferSync(filePath);
  if (!bytes) return null;
  const info = inspectBytes(bytes, stats.size, stats.mtimeMs);
  sourceCache.set(key, info);
  return info;
}

/**
 * Inspects a source image.
 *
 * @param filePath - Absolute path of the image
 * @returns Facts about the image, or null if it does not exist
 */
export async function inspectSource(filePath: string): Promise<SourceInfo | null> {
  if (!(await pathExists(filePath))) return null;
  const stats = await stat(filePath);
  if (!stats.isFile()) return null;

  const key = cacheKey(filePath);
  const cached = sourceCache.get(key);
  if (isCurrent(cached, stats.size, stats.mtimeMs)) return cached!;

  const bytes = await readFileBuffer(filePath);
  if (!bytes) return null;
  const info = inspectBytes(bytes, stats.size, stats.mtimeMs);
  sourceCache.set(key, info);
  return info;
}

/**
 * Seeds the cache, for example from the images manifest of a previous build.
 * Entries are still checked against the file's size and modification time before use.
 */
export function seedSourceCache(entries: Record<string, SourceInfo>): void {
  for (const [path, info] of Object.entries(entries)) {
    if (!sourceCache.has(cacheKey(path))) {
      sourceCache.set(cacheKey(path), info);
    }
  }
}

/**
 * Returns the cached facts for the given paths, for saving in the images manifest.
 */
export function getSourceCacheEntries(paths: Iterable<string>): Record<string, SourceInfo> {
  const entries: Record<string, SourceInfo> = {};
  for (const path of paths) {
    const info = sourceCache.get(cacheKey(path));
    if (info) entries[cacheKey(path)] = info;
  }
  return entries;
}

/**
 * Clears the cache. Used by tests.
 */
export function clearSourceCache(): void {
  sourceCache.clear();
}
