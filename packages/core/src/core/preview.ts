import { createServer } from 'node:http';
import type { Logger, StatiConfig } from '../types/index.js';
import { loadServerConfig } from './server-config.js';
import { getEnv, setEnv } from '../env.js';
import {
  parseRequestPath,
  createFallbackLogger,
  mergeServerOptions,
  assertPortAvailable,
  listenOnPort,
  openInBrowser,
  createStaticFileServer,
  getBasePath,
  resolveBasePathRequest,
  respondToBasePathRequest,
} from './utils/index.js';
import { DEFAULT_PREVIEW_PORT, DEFAULT_DEV_HOST } from '../constants.js';

export interface PreviewServerOptions {
  /** Port for preview server (default: 4000) */
  port?: number;
  /** Host for preview server (default: 'localhost') */
  host?: string;
  /** Whether to open browser automatically (default: false) */
  open?: boolean;
  /** Logger instance */
  logger?: Logger;
}

export interface PreviewServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  url: string;
}

/**
 * Creates a preview server that serves the built site from the dist directory
 * without live reload functionality, perfect for previewing the production build.
 * It loads the config in the production environment, as `stati build` does, and then
 * restores the environment it was called in.
 */
export async function createPreviewServer(
  options: PreviewServerOptions = {},
): Promise<PreviewServer> {
  const logger = options.logger ?? createFallbackLogger();

  // Load the config in production, so a config that branches on getEnv() gives the output
  // directory and base path of the production build this server serves. Nothing after this
  // reads the environment, so the caller's is restored.
  const callerEnv = getEnv();
  setEnv('production');
  let outDir: string;
  let config: StatiConfig;
  try {
    ({ outDir, config } = await loadServerConfig(logger));
  } finally {
    setEnv(callerEnv);
  }

  // Merge config values with options (options take precedence)
  const { port, host, open } = mergeServerOptions({
    options,
    config: config.preview,
    defaults: {
      port: DEFAULT_PREVIEW_PORT,
      host: DEFAULT_DEV_HOST,
      open: false,
    },
  });

  // The site is served under the path of site.baseUrl, as the host serves it
  const basePath = getBasePath(config.site.baseUrl);
  const url = `http://${host}:${port}${basePath ? `${basePath}/` : ''}`;
  let httpServer: ReturnType<typeof createServer> | null = null;

  // Unlike the dev server, pages are served as built: no error overlay or live reload script
  const fileServer = createStaticFileServer({ outDir, logger });

  const previewServer: PreviewServer = {
    url,

    async start(): Promise<void> {
      await assertPortAvailable(port, host, 'preview.port');

      // Create HTTP server
      httpServer = createServer(async (req, res) => {
        logger.processing?.(`${req.method} ${req.url || '/'}`);

        const requestPath = parseRequestPath(req.url);
        if (requestPath === null) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('400 - Bad Request');
          return;
        }

        const target = resolveBasePathRequest(req.url, requestPath, basePath);
        if (target.kind !== 'serve') {
          respondToBasePathRequest(res, target, basePath);
          return;
        }

        await fileServer.respond(res, target.path);
      });

      // Start HTTP server
      await listenOnPort(httpServer, port, host, 'preview.port');

      logger.success?.(`Preview server running at ${url}`);
      logger.info?.(`\nServing:`);
      logger.info?.(`  • ${outDir}`);

      // Open browser if requested
      if (open) {
        await openInBrowser(url, logger);
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
