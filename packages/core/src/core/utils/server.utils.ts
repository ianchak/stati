import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:net';

/**
 * Error codes for which a port is considered unavailable
 */
export type PortUnavailableCode = 'EADDRINUSE' | 'EACCES';

/**
 * Thrown when a server cannot bind to its configured port.
 * The message is user-facing and explains how to pick a different port.
 */
export class PortUnavailableError extends Error {
  readonly port: number;
  readonly host: string;
  readonly code: PortUnavailableCode;

  constructor(port: number, host: string, code: PortUnavailableCode, configKey?: string) {
    const reason =
      code === 'EADDRINUSE'
        ? `Port ${port} is already in use on ${host}. Stop the process using it, or choose another port`
        : `Permission denied to use port ${port} on ${host}. Choose another port`;
    const hint = configKey ? ` with --port or \`${configKey}\` in your Stati config.` : '.';

    super(`${reason}${hint}`);
    this.name = 'PortUnavailableError';
    this.port = port;
    this.host = host;
    this.code = code;
  }
}

/**
 * Converts a server `listen` error into a {@link PortUnavailableError} when the
 * failure is caused by the port being taken or restricted. Other errors are returned as-is.
 *
 * @param error - Error emitted by `server.listen()`
 * @param port - Port the server tried to bind to
 * @param host - Host the server tried to bind to
 * @param configKey - Config key users can set to change the port (e.g. `dev.port`)
 * @returns A PortUnavailableError or the original error
 */
export function toPortUnavailableError(
  error: unknown,
  port: number,
  host: string,
  configKey?: string,
): unknown {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  if (code === 'EADDRINUSE' || code === 'EACCES') {
    return new PortUnavailableError(port, host, code, configKey);
  }
  return error;
}

/**
 * Verifies that a port can be bound on the given host by briefly listening on it.
 * Use this before expensive startup work so an occupied port fails fast.
 *
 * @param port - Port to check
 * @param host - Host to bind to
 * @param configKey - Config key users can set to change the port (e.g. `dev.port`)
 * @throws {PortUnavailableError} When the port is in use or not permitted
 */
export function assertPortAvailable(port: number, host: string, configKey?: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const probe = createServer();

    probe.once('error', (error) => {
      reject(toPortUnavailableError(error, port, host, configKey));
    });

    probe.once('listening', () => {
      probe.close(() => resolve());
    });

    probe.listen(port, host);
  });
}

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

/**
 * Options for merging server configuration
 */
export interface MergeServerOptionsParams<T> {
  /** Options passed programmatically */
  options: T;
  /** Configuration object from config file */
  config: { port?: number; host?: string; open?: boolean } | undefined;
  /** Default values to use when neither options nor config provide a value */
  defaults: {
    port: number;
    host: string;
    open: boolean;
  };
}

/**
 * Result of merging server options
 */
export interface MergedServerOptions {
  /** Merged port value */
  port: number;
  /** Merged host value */
  host: string;
  /** Merged open browser value */
  open: boolean;
}

/**
 * Merges server options with config file values and defaults.
 * Programmatic options take precedence over config file, which takes precedence over defaults.
 *
 * @param params - The merge parameters
 * @returns Merged server options
 */
export function mergeServerOptions<T extends { port?: number; host?: string; open?: boolean }>(
  params: MergeServerOptionsParams<T>,
): MergedServerOptions {
  const { options, config, defaults } = params;

  return {
    port: options.port ?? config?.port ?? defaults.port,
    host: options.host ?? config?.host ?? defaults.host,
    open: options.open ?? config?.open ?? defaults.open,
  };
}
