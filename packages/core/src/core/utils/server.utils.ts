import { extname, join, resolve, sep } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import type { Server, ServerResponse } from 'node:http';
import { createServer } from 'node:net';
import type { Logger } from '../../types/index.js';
import { decodeBasePath, stripBasePath } from './base-path.utils.js';

/**
 * Content types the dev and preview servers send, by file extension. Covers the files Stati
 * generates (pages, bundles, search index, sitemap, robots.txt, feeds, responsive images) and
 * common static assets; anything else is sent as `application/octet-stream`.
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm',
};

/**
 * Gets the content type for a file from its extension.
 *
 * @param filePath - Path or file name of the file being served
 * @returns The content type, or `application/octet-stream` for unknown extensions
 */
export function getMimeType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Turns a request URL into the path of the file it asks for: the query string is dropped and
 * percent-escapes are decoded, so `/about?ref=x` asks for `/about` and `/my%20file.pdf` for
 * `/my file.pdf`.
 *
 * @param url - The request URL as received (`req.url`)
 * @returns The decoded path, or null when the URL is malformed (a bad escape or a NUL byte)
 */
export function parseRequestPath(url: string | undefined): string | null {
  const rawPath = (url || '/').split(/[?#]/, 1)[0] || '/';
  try {
    const path = decodeURIComponent(rawPath);
    return path.includes('\0') ? null : path;
  } catch {
    return null;
  }
}

/**
 * What a server does with a request when the site is served from a base path.
 * - `serve`: serve `path`, the request path from the site root
 * - `redirect`: send the browser to `location`
 * - `outside`: the URL is not part of the site
 */
export type BasePathRequest =
  { kind: 'serve'; path: string } | { kind: 'redirect'; location: string } | { kind: 'outside' };

/**
 * Maps a request URL to the site served under a base path, as a host that maps a subfolder
 * to the site does: `/docs/about` is the site's `/about`, `/` and `/docs` redirect to `/docs/`
 * (keeping the query string), and any other URL is outside the site.
 *
 * @param url - The request URL as received (`req.url`)
 * @param requestPath - The decoded request path, from {@link parseRequestPath}
 * @param basePath - The base path from `getBasePath()`; without one the request is served as it is
 */
export function resolveBasePathRequest(
  url: string | undefined,
  requestPath: string,
  basePath: string,
): BasePathRequest {
  if (basePath === '') {
    return { kind: 'serve', path: requestPath };
  }
  const decodedBasePath = decodeBasePath(basePath);
  if (requestPath === '/' || requestPath === decodedBasePath) {
    const search = /\?[^#]*/.exec(url ?? '')?.[0] ?? '';
    return { kind: 'redirect', location: `${basePath}/${search}` };
  }
  const path = stripBasePath(requestPath, decodedBasePath);
  return path === undefined ? { kind: 'outside' } : { kind: 'serve', path };
}

/**
 * Answers a request that is not served from the site: the redirect to the base path, or the
 * 404 for a URL outside it.
 *
 * @param res - The response
 * @param target - What {@link resolveBasePathRequest} decided
 * @param basePath - The base path, which the 404 names
 */
export function respondToBasePathRequest(
  res: ServerResponse,
  target: Exclude<BasePathRequest, { kind: 'serve' }>,
  basePath: string,
): void {
  if (target.kind === 'redirect') {
    res.writeHead(302, { Location: target.location });
    res.end();
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end(`404 - Not found. This site is served under ${basePath}/`);
}

/**
 * Finds the site's custom not-found page, the one static hosts serve for a missing URL.
 *
 * @param outDir - The output directory being served
 * @returns The path of `404.html` (or `404/index.html` for a `/404/` permalink), or null
 */
export async function resolveNotFoundPage(outDir: string): Promise<string | null> {
  for (const candidate of [join(outDir, '404.html'), join(outDir, '404', 'index.html')]) {
    try {
      if ((await stat(candidate)).isFile()) {
        return candidate;
      }
    } catch {
      // Not there; try the next one
    }
  }
  return null;
}

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
 * Starts an HTTP server on the port and host.
 *
 * @param server - The server to start
 * @param port - Port to listen on
 * @param host - Host to bind to
 * @param configKey - Config key users can set to change the port (e.g. `dev.port`)
 * @throws {PortUnavailableError} When the port is in use or not permitted; other listen errors
 *   as they are
 */
export function listenOnPort(
  server: Server,
  port: number,
  host: string,
  configKey: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => {
      resolve();
    });

    server.on('error', (error: unknown) => {
      reject(toPortUnavailableError(error, port, host, configKey));
    });
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
 * Resolves a request path to the file it names inside the served directory. This is where a
 * request path becomes a file system path: every file the servers read is this path or
 * derived from it, so no request reaches outside the directory, whether through `..`
 * segments (raw or percent-encoded), backslashes or an absolute path.
 *
 * @param outDir - The directory being served
 * @param requestPath - The decoded request path, from {@link parseRequestPath}
 * @returns The absolute path, or null when it points outside the directory
 */
export function resolveRequestFile(outDir: string, requestPath: string): string | null {
  const root = resolve(outDir);
  const filePath = resolve(root, requestPath.replace(/^[/\\]+/, ''));
  if (filePath === root) {
    return root;
  }
  const rootPrefix = root.endsWith(sep) ? root : root + sep;
  if (!filePath.startsWith(rootPrefix)) {
    return null;
  }
  return filePath;
}

/**
 * The result for a candidate file: found when it exists and is a file.
 */
async function fileResult(candidate: string | null): Promise<PrettyUrlResult> {
  if (candidate !== null) {
    try {
      if ((await stat(candidate)).isFile()) {
        return { filePath: candidate, found: true };
      }
    } catch {
      // Not there
    }
  }
  return { filePath: null, found: false };
}

/**
 * Attempts to resolve pretty URL paths by trying various fallback strategies.
 * This handles common patterns like:
 * - /path/ -> /path/index.html
 * - /path/ -> /path.html (if no index.html exists)
 * - /path -> /path.html (when original path is not found and has no extension)
 *
 * @param outDir The output directory to serve files from
 * @param requestPath The requested URL path, which decides the fallbacks
 * @param requestFile The file the request names, from {@link resolveRequestFile}. Every
 *   candidate is derived from it, so none is outside the output directory
 * @returns Promise resolving to the file path to serve or null if not found
 */
export async function resolvePrettyUrl(
  outDir: string,
  requestPath: string,
  requestFile: string,
): Promise<PrettyUrlResult> {
  // The sibling .html file: /blog/ and /blog are served from blog.html. The output
  // directory itself has none, as its sibling is outside it.
  const htmlFile = requestFile === resolve(outDir) ? null : `${requestFile}.html`;

  try {
    const stats = await stat(requestFile);

    if (stats.isDirectory()) {
      // Try to serve index.html from directory
      const indexPath = join(requestFile, 'index.html');
      try {
        await stat(indexPath);
        return { filePath: indexPath, found: true };
      } catch {
        // If no index.html in directory, try to serve corresponding .html file
        // For example: /examples/ -> examples.html
        return await fileResult(htmlFile);
      }
    }

    // File exists and is not a directory
    return { filePath: requestFile, found: true };
  } catch {
    // File not found: try the .html file for /path/ and for /path without an extension
    if (requestPath.endsWith('/') || !requestPath.includes('.')) {
      return await fileResult(htmlFile);
    }
    return { filePath: null, found: false };
  }
}

/**
 * Whether a request asks for a page rather than a file the page loads: a path without an
 * extension (`/`, `/about`) or an `.html` file.
 *
 * @param sitePath - The request path from the site root
 */
export function isPageRequest(sitePath: string): boolean {
  return !sitePath.includes('.') || sitePath.endsWith('.html');
}

/**
 * What a server answers a request with
 */
export interface StaticFileResponse {
  /** The response body */
  content: Buffer | string;
  /** The `Content-Type` */
  mimeType: string;
  /** The HTTP status */
  statusCode: number;
}

/**
 * Options for {@link createStaticFileServer}
 */
export interface StaticFileServerOptions {
  /** The directory served */
  outDir: string;
  /** Logs the requests that fail */
  logger: Logger;
  /**
   * Answers a page request in place of the file, or returns null to serve the file. The dev
   * server shows its error overlay this way.
   */
  interceptHtml?: (sitePath: string) => Promise<StaticFileResponse | null>;
  /**
   * Rewrites every HTML page served, the 404 page included. The dev server adds its live reload
   * script this way.
   */
  transformHtml?: (html: string) => string;
}

/**
 * Serves the files of a built site, as the dev and preview servers do
 */
export interface StaticFileServer {
  /**
   * The response for a request path: the file, a pretty URL's page, the site's 404 page or a
   * plain 404, and a 403 for a path outside the output directory.
   *
   * @param sitePath - The decoded request path from the site root, with any base path removed
   */
  serve(sitePath: string): Promise<StaticFileResponse>;
  /**
   * Answers a request with {@link StaticFileServer.serve}'s response, or with a 500 when serving
   * it fails.
   *
   * @param res - The response
   * @param sitePath - The decoded request path from the site root, with any base path removed
   */
  respond(res: ServerResponse, sitePath: string): Promise<void>;
}

/**
 * Creates the file server the dev and preview servers share. Responses are never cached, so a
 * reload always shows the latest build.
 *
 * @param options - The directory served and the dev server's additions
 */
export function createStaticFileServer(options: StaticFileServerOptions): StaticFileServer {
  const { outDir, logger, interceptHtml, transformHtml } = options;

  async function serve(sitePath: string): Promise<StaticFileResponse> {
    if (interceptHtml && isPageRequest(sitePath)) {
      const intercepted = await interceptHtml(sitePath);
      if (intercepted) {
        return intercepted;
      }
    }

    // Security: the file the request names, or null when it is outside the output directory
    const requestFile = resolveRequestFile(outDir, sitePath);
    if (requestFile === null) {
      return {
        content: '403 - Forbidden',
        mimeType: 'text/plain',
        statusCode: 403,
      };
    }

    const { filePath, found } = await resolvePrettyUrl(outDir, sitePath, requestFile);

    if (!found || !filePath) {
      // Serve the site's 404 page, as static hosts do
      const notFoundPage = await resolveNotFoundPage(outDir);
      if (notFoundPage) {
        return {
          content: transformHtml
            ? transformHtml(await readFile(notFoundPage, 'utf-8'))
            : await readFile(notFoundPage),
          mimeType: 'text/html',
          statusCode: 404,
        };
      }

      return {
        content: sitePath.endsWith('/')
          ? '404 - Directory listing not available'
          : '404 - File not found',
        mimeType: 'text/plain',
        statusCode: 404,
      };
    }

    try {
      const mimeType = getMimeType(filePath);
      const content = await readFile(filePath);
      return {
        content:
          transformHtml && mimeType === 'text/html'
            ? transformHtml(content.toString('utf-8'))
            : content,
        mimeType,
        statusCode: 200,
      };
    } catch {
      // This should rarely happen since resolvePrettyUrl already checked the file exists
      return {
        content: '500 - Error reading file',
        mimeType: 'text/plain',
        statusCode: 500,
      };
    }
  }

  async function respond(res: ServerResponse, sitePath: string): Promise<void> {
    try {
      const { content, mimeType, statusCode } = await serve(sitePath);

      res.writeHead(statusCode, {
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });

      res.end(content);
    } catch (error) {
      logger.error?.(`Server error: ${error instanceof Error ? error.message : String(error)}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 - Internal Server Error');
    }
  }

  return { serve, respond };
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

/**
 * Opens a URL in the default browser, for the `open` server option. Failing to open it is not
 * an error: the server keeps running, and the user opens the URL themselves.
 *
 * @param url - The server's URL
 * @param logger - Logs that the browser could not be opened
 */
export async function openInBrowser(url: string, logger: Logger): Promise<void> {
  try {
    const { default: openBrowser } = await import('open');
    await openBrowser(url);
  } catch {
    logger.info?.('Could not open browser automatically');
  }
}
