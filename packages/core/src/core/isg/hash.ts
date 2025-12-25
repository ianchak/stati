import { createHash } from 'node:crypto';
import { readFile, pathExists } from '../utils/index.js';

/**
 * Creates a SHA-256 hash instance, updates it with data, and returns the hex digest.
 * Internal utility to eliminate duplicate hash creation patterns.
 *
 * @param data - Data to hash
 * @returns SHA-256 hash as a hex string with 'sha256-' prefix
 */
function createSha256Hash(data: string | string[]): string {
  const hash = createHash('sha256');

  if (Array.isArray(data)) {
    for (const item of data) {
      hash.update(item, 'utf-8');
    }
  } else {
    hash.update(data, 'utf-8');
  }

  return `sha256-${hash.digest('hex')}`;
}

/**
 * Per-build cache for file hashes to avoid recomputing the same file hash
 * multiple times during a single build.
 * Key: normalized file path, Value: computed hash or null if file doesn't exist
 */
const fileHashCache = new Map<string, string | null>();

/**
 * Clears the file hash cache. Should be called at the start of each build.
 */
export function clearFileHashCache(): void {
  fileHashCache.clear();
}

/**
 * Computes a SHA-256 hash of page content and front matter.
 * Used to detect when page content has changed.
 *
 * @param content - The raw markdown content of the page
 * @param frontMatter - The parsed front matter object
 * @returns SHA-256 hash as a hex string
 *
 * @example
 * ```typescript
 * const hash = computeContentHash('# Hello World', { title: 'My Post' });
 * console.log(hash); // "sha256-abc123..."
 * ```
 */
export function computeContentHash(content: string, frontMatter: Record<string, unknown>): string {
  // Hash the front matter (sorted for consistency)
  // Note: We need to sort keys at all levels, not just top level
  const sortKeys = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);

    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  };

  const sortedFrontMatter = JSON.stringify(sortKeys(frontMatter));

  return createSha256Hash([content, sortedFrontMatter]);
}

/**
 * Computes a SHA-256 hash of a file's contents.
 * Used for tracking template and partial file changes.
 *
 * @param filePath - Absolute path to the file
 * @returns Promise resolving to SHA-256 hash as a hex string, or null if file doesn't exist
 *
 * @example
 * ```typescript
 * const hash = await computeFileHash('/path/to/template.eta');
 * if (hash) {
 *   console.log(`Template hash: ${hash}`);
 * }
 * ```
 */
export async function computeFileHash(filePath: string): Promise<string | null> {
  // Normalize path for consistent cache key
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Check cache first
  if (fileHashCache.has(normalizedPath)) {
    return fileHashCache.get(normalizedPath) ?? null;
  }

  try {
    if (!(await pathExists(filePath))) {
      fileHashCache.set(normalizedPath, null);
      return null;
    }

    const content = await readFile(filePath, 'utf-8');
    if (!content) {
      fileHashCache.set(normalizedPath, null);
      return null;
    }
    const hash = createSha256Hash(content);
    fileHashCache.set(normalizedPath, hash);
    return hash;
  } catch (error) {
    console.warn(
      `Failed to compute hash for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    fileHashCache.set(normalizedPath, null);
    return null;
  }
}

/**
 * Computes a combined hash from content hash and dependency hashes.
 * This represents the complete input state for a page.
 *
 * @param contentHash - Hash of the page content and front matter
 * @param depsHashes - Array of dependency file hashes
 * @returns Combined SHA-256 hash as a hex string
 *
 * @example
 * ```typescript
 * const contentHash = computeContentHash(content, frontMatter);
 * const depsHashes = ['sha256-dep1...', 'sha256-dep2...'];
 * const inputsHash = computeInputsHash(contentHash, depsHashes);
 * ```
 */
export function computeInputsHash(contentHash: string, depsHashes: string[]): string {
  // Sort dependency hashes for consistency
  const sortedDepsHashes = [...depsHashes].sort();

  return createSha256Hash([contentHash, ...sortedDepsHashes]);
}

/**
 * Computes a hash of the navigation tree structure.
 * Used to detect when navigation has changed (title, url, order, children structure).
 *
 * @param navigation - The navigation tree to hash
 * @returns SHA-256 hash as a hex string
 *
 * @example
 * ```typescript
 * const hash = computeNavigationHash(navigationTree);
 * console.log(hash); // "sha256-abc123..."
 * ```
 */
export function computeNavigationHash(navigation: unknown[]): string {
  // Convert navigation tree to a deterministic JSON string
  // Only include fields that affect navigation structure:
  // - title (displayed in menu)
  // - url (navigation links)
  // - order (affects sorting)
  // - children (nested structure)
  interface NormalizedNode {
    title: string;
    url: string;
    order?: number;
    children?: NormalizedNode[];
  }

  const normalizeNavNode = (node: Record<string, unknown>): NormalizedNode => {
    const normalized: NormalizedNode = {
      title: String(node.title ?? ''),
      url: String(node.url ?? ''),
    };

    if (node.order !== undefined && typeof node.order === 'number') {
      normalized.order = node.order;
    }

    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      normalized.children = node.children.map((child) =>
        normalizeNavNode(child as Record<string, unknown>),
      );
    }

    return normalized;
  };

  const normalizedNav = navigation.map((node) => normalizeNavNode(node as Record<string, unknown>));
  const navJson = JSON.stringify(normalizedNav);

  return createSha256Hash(navJson);
}
