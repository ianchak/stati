import { join } from 'path';
import { stat } from 'fs/promises';

/**
 * Result of attempting to resolve a pretty URL path
 */
export interface PrettyUrlResult {
  /** The resolved file path to serve */
  filePath: string | null;
  /** Whether the path was found */
  found: boolean;
}

/**
 * Attempts to resolve pretty URL paths by trying various fallback strategies.
 * This handles common patterns like:
 * - /path/ -> /path/index.html
 * - /path/ -> /path.html (if no index.html exists)
 * - /path -> /path.html (when original path is not found and has no extension)
 *
 * @param outDir The output directory to serve files from
 * @param requestPath The requested URL path
 * @param originalFilePath The original file path that was attempted
 * @returns Promise resolving to the file path to serve or null if not found
 */
export async function resolvePrettyUrl(
  outDir: string,
  requestPath: string,
  originalFilePath: string,
): Promise<PrettyUrlResult> {
  try {
    const stats = await stat(originalFilePath);

    if (stats.isDirectory()) {
      // Try to serve index.html from directory
      const indexPath = join(originalFilePath, 'index.html');
      try {
        await stat(indexPath);
        return { filePath: indexPath, found: true };
      } catch {
        // If no index.html in directory, try to serve corresponding .html file
        // For example: /examples/ -> examples.html
        const directoryName = requestPath.replace(/\/$/, ''); // Remove trailing slash
        const fallbackPath = join(outDir, `${directoryName}.html`);

        try {
          await stat(fallbackPath);
          return { filePath: fallbackPath, found: true };
        } catch {
          return { filePath: null, found: false };
        }
      }
    }

    // File exists and is not a directory
    return { filePath: originalFilePath, found: true };
  } catch {
    // File not found, try fallback strategies for pretty URLs
    if (requestPath.endsWith('/')) {
      // For requests ending with /, try the corresponding .html file
      const pathWithoutSlash = requestPath.slice(0, -1);
      const htmlPath = join(outDir, `${pathWithoutSlash}.html`);

      try {
        const stats = await stat(htmlPath);
        if (stats.isFile()) {
          return { filePath: htmlPath, found: true };
        }
      } catch {
        // Continue to not found
      }
    } else if (!requestPath.includes('.')) {
      // For requests without trailing slash and without extension, try .html
      const htmlPath = join(outDir, `${requestPath}.html`);

      try {
        const stats = await stat(htmlPath);
        if (stats.isFile()) {
          return { filePath: htmlPath, found: true };
        }
      } catch {
        // Continue to not found
      }
    }

    // No fallback worked
    return { filePath: null, found: false };
  }
}
