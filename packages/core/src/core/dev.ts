import { createServer } from 'http';
import { join, extname } from 'path';
import { posix } from 'path';
import { readFile } from 'fs/promises';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import type { StatiConfig, Logger } from '../types/index.js';
import type { FSWatcher } from 'chokidar';
import { build } from './build.js';
import { invalidate } from './invalidate.js';
import { loadConfig } from '../config/loader.js';
import { loadCacheManifest, saveCacheManifest } from './isg/manifest.js';
import { resolveDevPaths, resolveCacheDir } from './utils/paths.js';
import { resolvePrettyUrl } from './utils/server.js';
import { DEFAULT_DEV_PORT, DEFAULT_DEV_HOST, TEMPLATE_EXTENSION } from '../constants.js';

export interface DevServerOptions {
  port?: number;
  host?: string;
  open?: boolean;
  configPath?: string;
  logger?: Logger;
}

export interface DevServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  url: string;
}

/**
 * Loads and validates configuration for the dev server.
 */
async function loadDevConfig(
  configPath: string | undefined,
  logger: Logger,
): Promise<{ config: StatiConfig; outDir: string; srcDir: string; staticDir: string }> {
  // Load configuration
  try {
    if (configPath) {
      // For custom config path, we need to change to that directory temporarily
      // This is a limitation of the current loadConfig implementation
      logger.info?.(`Loading config from: ${configPath}`);
    }
    const config = await loadConfig(process.cwd());
    const { outDir, srcDir, staticDir } = resolveDevPaths(config);

    return { config, outDir, srcDir, staticDir };
  } catch (error) {
    logger.error?.(
      `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Performs an initial build to ensure dist/ exists
 */
async function performInitialBuild(configPath: string | undefined, logger: Logger): Promise<void> {
  try {
    // Clear cache to ensure fresh build on dev server start
    logger.info?.('Clearing cache for fresh development build...');
    await invalidate();

    await build({
      logger,
      force: false,
      clean: false,
      ...(configPath && { configPath }),
    });
  } catch (error) {
    logger.error?.(
      `Initial build failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Performs incremental rebuild when files change, using ISG logic for smart rebuilds
 */
async function performIncrementalRebuild(
  changedPath: string,
  configPath: string | undefined,
  logger: Logger,
  wsServer: WebSocketServer | null,
  isBuildingRef: { value: boolean },
): Promise<void> {
  if (isBuildingRef.value) {
    logger.info?.('Build in progress, skipping...');
    return;
  }

  isBuildingRef.value = true;
  const startTime = Date.now();

  // Create a quiet logger for dev builds that suppresses verbose output
  const devLogger: Logger = {
    info: () => {}, // Suppress info messages
    success: () => {}, // Suppress success messages
    error: logger.error || (() => {}),
    warning: logger.warning || (() => {}),
    building: () => {}, // Suppress building messages
    processing: () => {}, // Suppress processing messages
    stats: () => {}, // Suppress stats messages
  };

  try {
    const relativePath = changedPath
      .replace(process.cwd(), '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');

    // Check if the changed file is a template/partial
    if (changedPath.endsWith(TEMPLATE_EXTENSION) || changedPath.includes('_partials')) {
      await handleTemplateChange(changedPath, configPath, devLogger);
    } else {
      // Content or static file changed - use normal rebuild
      await build({
        logger: devLogger,
        force: false,
        clean: false,
        ...(configPath && { configPath }),
      });
    }

    // Notify all connected clients to reload
    if (wsServer) {
      wsServer.clients.forEach((client: unknown) => {
        const ws = client as { readyState: number; send: (data: string) => void };
        if (ws.readyState === 1) {
          // WebSocket.OPEN
          ws.send(JSON.stringify({ type: 'reload' }));
        }
      });
    }

    const duration = Date.now() - startTime;
    logger.info?.(`⚡ ${relativePath} rebuilt in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error?.(
      `❌ Rebuild failed after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    isBuildingRef.value = false;
  }
}

/**
 * Handles template/partial file changes by invalidating affected pages
 */
async function handleTemplateChange(
  templatePath: string,
  configPath: string | undefined,
  logger: Logger,
): Promise<void> {
  const cacheDir = resolveCacheDir();

  try {
    // Load existing cache manifest
    const cacheManifest = await loadCacheManifest(cacheDir);

    if (!cacheManifest) {
      // No cache exists, perform full rebuild
      await build({
        logger,
        force: false,
        clean: false,
        ...(configPath && { configPath }),
      });
      return;
    }

    // Find pages that depend on this template
    const affectedPages: string[] = [];
    const normalizedTemplatePath = posix.normalize(templatePath.replace(/\\/g, '/'));

    for (const [pagePath, entry] of Object.entries(cacheManifest.entries)) {
      if (
        entry.deps.some((dep) => {
          const normalizedDep = posix.normalize(dep.replace(/\\/g, '/'));
          // Use endsWith for more precise matching to avoid false positives
          return (
            normalizedDep === normalizedTemplatePath ||
            normalizedDep.endsWith('/' + normalizedTemplatePath)
          );
        })
      ) {
        affectedPages.push(pagePath);
        // Remove from cache to force rebuild
        delete cacheManifest.entries[pagePath];
      }
    }

    if (affectedPages.length > 0) {
      // Save updated cache manifest
      await saveCacheManifest(cacheDir, cacheManifest);

      // Perform incremental rebuild (only affected pages will be rebuilt)
      await build({
        logger,
        force: false,
        clean: false,
        ...(configPath && { configPath }),
      });
    } else {
      // If no affected pages were found but a template changed,
      // force a full rebuild to ensure changes are reflected
      // This can happen if dependency tracking missed something
      await build({
        logger,
        force: true,
        clean: false,
        ...(configPath && { configPath }),
      });
    }
  } catch {
    // Fallback to full rebuild
    await build({
      logger,
      force: false,
      clean: false,
      ...(configPath && { configPath }),
    });
  }
}

export async function createDevServer(options: DevServerOptions = {}): Promise<DevServer> {
  const {
    port = DEFAULT_DEV_PORT,
    host = DEFAULT_DEV_HOST,
    open = false,
    configPath,
    logger = {
      info: (msg: string) => console.log(msg),
      success: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
      warning: (msg: string) => console.warn(msg),
      building: (msg: string) => console.log(msg),
      processing: (msg: string) => console.log(msg),
      stats: (msg: string) => console.log(msg),
    },
  } = options;

  const url = `http://${host}:${port}`;
  let httpServer: ReturnType<typeof createServer> | null = null;
  let wsServer: WebSocketServer | null = null;
  let watcher: FSWatcher | null = null;
  const isBuildingRef = { value: false };

  // Load configuration
  const { config: _config, outDir, srcDir, staticDir } = await loadDevConfig(configPath, logger);

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
   * Injects live reload script into HTML responses
   */
  function injectLiveReloadScript(html: string): string {
    const script = `
<script>
(function() {
  const ws = new WebSocket('ws://${host}:${port}/__ws');
  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'reload') {
      console.log('Reloading page due to file changes...');
      window.location.reload();
    }
  };
  ws.onopen = function() {
    console.log('Connected to Stati dev server');
  };
  ws.onclose = function() {
    console.log('Lost connection to Stati dev server');
    // Try to reconnect after a delay
    setTimeout(() => window.location.reload(), 1000);
  };
})();
</script>`;

    // Insert before closing </body> tag, or at the end if no </body>
    if (html.includes('</body>')) {
      return html.replace('</body>', `${script}\n</body>`);
    } else {
      return html + script;
    }
  }

  /**
   * Serves files from the dist directory
   */
  async function serveFile(
    requestPath: string,
  ): Promise<{ content: Buffer | string; mimeType: string; statusCode: number }> {
    const originalFilePath = join(outDir, requestPath === '/' ? 'index.html' : requestPath);

    // Use the shared pretty URL resolver
    const { filePath, found } = await resolvePrettyUrl(outDir, requestPath, originalFilePath);

    if (!found || !filePath) {
      return {
        content: requestPath.endsWith('/')
          ? '404 - Directory listing not available'
          : '404 - File not found',
        mimeType: 'text/plain',
        statusCode: 404,
      };
    }

    try {
      const mimeType = getMimeType(filePath);
      const content = await readFile(filePath);

      // Inject live reload script into HTML files
      if (mimeType === 'text/html') {
        const html = content.toString('utf-8');
        const injectedHtml = injectLiveReloadScript(html);
        return {
          content: injectedHtml,
          mimeType,
          statusCode: 200,
        };
      }

      return {
        content,
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

  const devServer: DevServer = {
    url,

    async start(): Promise<void> {
      // Perform initial build
      await performInitialBuild(configPath, logger);

      // Create HTTP server
      httpServer = createServer(async (req, res) => {
        const requestPath = req.url || '/';

        // Handle WebSocket upgrade path
        if (requestPath === '/__ws') {
          return; // Let WebSocket server handle this
        }

        logger.processing?.(`${req.method} ${requestPath}`);

        try {
          const { content, mimeType, statusCode } = await serveFile(requestPath);

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
      });

      // Create WebSocket server for live reload
      wsServer = new WebSocketServer({
        server: httpServer,
        path: '/__ws',
      });

      wsServer.on('connection', (ws: unknown) => {
        logger.info?.('Browser connected for live reload');

        const websocket = ws as { on: (event: string, handler: () => void) => void };
        websocket.on('close', () => {
          logger.info?.('Browser disconnected from live reload');
        });
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

      // Set up file watching
      const watchPaths = [srcDir, staticDir].filter(Boolean);
      watcher = chokidar.watch(watchPaths, {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('change', (path: string) => {
        void performIncrementalRebuild(path, configPath, logger, wsServer, isBuildingRef);
      });

      watcher.on('add', (path: string) => {
        void performIncrementalRebuild(path, configPath, logger, wsServer, isBuildingRef);
      });

      watcher.on('unlink', (path: string) => {
        void performIncrementalRebuild(path, configPath, logger, wsServer, isBuildingRef);
      });

      logger.success?.(`Dev server running at ${url}`);
      logger.info?.(`\nServing from:`);
      logger.info?.(`  📁 ${outDir}`);
      logger.info?.('Watching:');
      watchPaths.forEach((path) => logger.info?.(`  📁 ${path}`));

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
      if (watcher) {
        await watcher.close();
        watcher = null;
      }

      if (wsServer) {
        wsServer.close();
        wsServer = null;
      }

      if (httpServer) {
        await new Promise<void>((resolve) => {
          httpServer!.close(() => resolve());
        });
        httpServer = null;
      }

      logger.info?.('🛑 Dev server stopped');
    },
  };

  return devServer;
}
