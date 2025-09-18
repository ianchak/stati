import { createServer } from 'http';
import { join, extname } from 'path';
import { readFile, stat } from 'fs/promises';
import type { Logger } from '../types/index.js';
import { loadConfig } from '../config/loader.js';
import { resolveDevPaths } from './utils/paths.js';
import { DEFAULT_DEV_PORT, DEFAULT_DEV_HOST } from '../constants.js';

export interface PreviewServerOptions {
  port?: number;
  host?: string;
  open?: boolean;
  configPath?: string;
  logger?: Logger;
}

export interface PreviewServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  url: string;
}

/**
 * Loads and validates configuration for the preview server.
 */
async function loadPreviewConfig(
  configPath: string | undefined,
  logger: Logger,
): Promise<{ outDir: string }> {
  try {
    if (configPath) {
      logger.info?.(`Loading config from: ${configPath}`);
    }
    const config = await loadConfig(process.cwd());
    const { outDir } = resolveDevPaths(config);

    return { outDir };
  } catch (error) {
    logger.error?.(
      `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Creates a preview server that serves the built site from the dist directory
 * without live reload functionality, perfect for previewing the production build.
 */
export async function createPreviewServer(
  options: PreviewServerOptions = {},
): Promise<PreviewServer> {
  const {
    port = DEFAULT_DEV_PORT,
    host = DEFAULT_DEV_HOST,
    open = false,
    configPath,
    logger = {
      info: () => {},
      success: () => {},
      error: (msg: string) => console.error(msg),
      warning: (msg: string) => console.warn(msg),
      building: () => {},
      processing: () => {},
      stats: () => {},
    },
  } = options;

  const url = `http://${host}:${port}`;
  let httpServer: ReturnType<typeof createServer> | null = null;

  // Load configuration
  const { outDir } = await loadPreviewConfig(configPath, logger);

  /**
   * Gets MIME type for a file based on its extension
   */
  function getMimeType(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Serves files from the dist directory
   */
  async function serveFile(
    requestPath: string,
  ): Promise<{ content: Buffer | string; mimeType: string; statusCode: number }> {
    let filePath = join(outDir, requestPath === '/' ? 'index.html' : requestPath);

    try {
      const stats = await stat(filePath);

      if (stats.isDirectory()) {
        // Try to serve index.html from directory
        const indexPath = join(filePath, 'index.html');
        try {
          await stat(indexPath);
          filePath = indexPath;
        } catch {
          return {
            content: '404 - Directory listing not available',
            mimeType: 'text/plain',
            statusCode: 404,
          };
        }
      }

      const mimeType = getMimeType(filePath);
      const content = await readFile(filePath);

      // Unlike dev server, we don't inject live reload script in preview mode
      return {
        content,
        mimeType,
        statusCode: 200,
      };
    } catch {
      // File not found
      return {
        content: '404 - File not found',
        mimeType: 'text/plain',
        statusCode: 404,
      };
    }
  }

  const previewServer: PreviewServer = {
    url,

    async start(): Promise<void> {
      // Create HTTP server
      httpServer = createServer(async (req, res) => {
        const requestPath = req.url || '/';

        logger.processing?.(`${req.method} ${requestPath}`);

        try {
          const { content, mimeType, statusCode } = await serveFile(requestPath);

          res.writeHead(statusCode, {
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=31536000', // Better caching for production preview
          });

          res.end(content);
        } catch (error) {
          logger.error?.(`Server error: ${error instanceof Error ? error.message : String(error)}`);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 - Internal Server Error');
        }
      });

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        httpServer!.listen(port, host, () => {
          resolve();
        });

        httpServer!.on('error', (error: unknown) => {
          reject(error);
        });
      });

      logger.success?.(`Preview server running at ${url}`);
      logger.info?.(`\nServing from:`);
      logger.info?.(`  📁 ${outDir}`);

      // Open browser if requested
      if (open) {
        try {
          const { default: openBrowser } = await import('open');
          await openBrowser(url);
        } catch {
          logger.info?.('Could not open browser automatically');
        }
      }
    },

    async stop(): Promise<void> {
      if (httpServer) {
        await new Promise<void>((resolve) => {
          httpServer!.close(() => {
            resolve();
          });
        });
        httpServer = null;
      }
    },
  };

  return previewServer;
}
