import { createHash } from 'crypto';
import fse from 'fs-extra';
const { readFile, pathExists } = fse;

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
  const sortedFrontMatter = JSON.stringify(frontMatter, Object.keys(frontMatter).sort());

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
  try {
    if (!(await pathExists(filePath))) {
      return null;
    }

    const content = await readFile(filePath, 'utf-8');
    return createSha256Hash(content);
  } catch (error) {
    console.warn(
      `Failed to compute hash for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
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
  // Hash each dependency hash in sorted order for consistency
  const sortedDepsHashes = [...depsHashes].sort();

  return createSha256Hash([contentHash, ...sortedDepsHashes]);
}
