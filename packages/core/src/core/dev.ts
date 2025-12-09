import { createServer } from 'node:http';
import { join, extname, posix } from 'node:path';
import { readFile } from 'node:fs/promises';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import type { BuildContext } from 'esbuild';
import type { StatiConfig, Logger } from '../types/index.js';
import type { FSWatcher } from 'chokidar';
import { build } from './build.js';
import { invalidate } from './invalidate.js';
import { loadConfig } from '../config/loader.js';
import { loadCacheManifest, saveCacheManifest, computeNavigationHash } from './isg/index.js';
import { loadContent } from './content.js';
import { buildNavigation } from './navigation.js';
import {
  resolveDevPaths,
  resolveCacheDir,
  resolvePrettyUrl,
  createErrorOverlay,
  parseErrorDetails,
  TemplateError,
  createFallbackLogger,
  mergeServerOptions,
  createTypeScriptWatcher,
} from './utils/index.js';
import { setEnv, getEnv } from '../env.js';
import {
  DEFAULT_DEV_PORT,
  DEFAULT_DEV_HOST,
  TEMPLATE_EXTENSION,
  DEFAULT_OUT_DIR,
} from '../constants.js';

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
async function performInitialBuild(
  configPath: string | undefined,
  logger: Logger,
  onError?: (error: Error) => void,
): Promise<void> {
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

    // Clear any previous errors on successful build
    if (onError) {
      onError(null!);
    }
  } catch (error) {
    const buildError = error instanceof Error ? error : new Error(String(error));
    logger.error?.(`Initial build failed: ${buildError.message}`);

    // Store the error for display in browser - DON'T clear it even if partial rebuild succeeds
    onError?.(buildError);

    // In development, don't throw - let the dev server start and show errors in browser
    logger.warning?.('Dev server will start with build errors. Check browser for error overlay.');
  }
}

/**
 * Performs incremental rebuild when files change, using ISG logic for smart rebuilds.
 * Uses a pending changes queue to ensure no file changes are lost when builds are in progress.
 *
 * @param changedPath - The path of the file that changed
 * @param eventType - The type of change: 'add', 'change', or 'unlink'
 * @param configPath - Optional path to the stati config file
 * @param staticDir - The static assets directory path
 * @param logger - Logger instance for output
 * @param wsServer - WebSocket server for live reload notifications
 * @param isBuildingRef - Mutable reference tracking whether a build is currently in progress
 * @param pendingChangesRef - Mutable reference holding queued file changes that occurred during an
 *   active build. The `changes` Map stores file paths as keys and their event types as values,
 *   ensuring each file is only processed once with its most recent event type.
 * @param onError - Optional callback invoked when build errors occur
 * @param batchedChanges - Array of changes to process in a single batch (used for pending queue processing)
 */
async function performIncrementalRebuild(
  changedPath: string,
  eventType: 'add' | 'change' | 'unlink',
  configPath: string | undefined,
  staticDir: string,
  logger: Logger,
  wsServer: WebSocketServer | null,
  isBuildingRef: { value: boolean },
  pendingChangesRef: { changes: Map<string, 'add' | 'change' | 'unlink'> },
  onError?: (error: Error | null) => void,
  batchedChanges: Array<{ path: string; eventType: 'add' | 'change' | 'unlink' }> = [],
): Promise<void> {
  // If a build is in progress, queue this change for processing after the current build
  if (isBuildingRef.value) {
    pendingChangesRef.changes.set(changedPath, eventType);
    return;
  }

  isBuildingRef.value = true;
  const startTime = Date.now();

  // All changes being processed in this build (primary + batched)
  const allChanges = [{ path: changedPath, eventType }, ...batchedChanges];

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

  // Helper to check if a path is a static asset
  const normalizedStaticDir = staticDir.replace(/\\/g, '/');
  const isStaticAsset = (path: string) => {
    const normalizedPath = path.replace(/\\/g, '/');
    return normalizedPath.startsWith(normalizedStaticDir);
  };

  // Helper to get relative path
  const getRelativePath = (path: string) =>
    path.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');

  try {
    // Check if the changed file is a template/partial
    if (changedPath.endsWith(TEMPLATE_EXTENSION) || changedPath.includes('_partials')) {
      await handleTemplateChange(changedPath, configPath, devLogger);
    } else if (changedPath.endsWith('.md')) {
      await handleMarkdownChange(changedPath, configPath, devLogger);
    } else {
      // Static file changed - use normal rebuild
      await build({
        logger: devLogger,
        force: false,
        clean: false,
        ...(configPath && { configPath }),
      });
    }

    // Clear any previous errors on successful build
    if (onError) {
      onError(null);
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

    // Log all files that were processed in this batch
    for (const change of allChanges) {
      const relativePath = getRelativePath(change.path);
      let action: string;
      if (change.eventType === 'unlink') {
        action = 'deleted';
      } else if (isStaticAsset(change.path)) {
        action = 'copied';
      } else {
        action = 'rebuilt';
      }
      logger.info?.(`⚡ ${relativePath} ${action}`);
    }
    logger.info?.(`   Done in ${duration}ms`);
  } catch (error) {
    const buildError = error instanceof Error ? error : new Error(String(error));
    const duration = Date.now() - startTime;
    logger.error?.(`❌ Rebuild failed after ${duration}ms: ${buildError.message}`);

    // Store the error for display in browser
    if (onError) {
      onError(buildError);
    }
  } finally {
    isBuildingRef.value = false;

    // Check if there are pending changes that occurred during this build
    if (pendingChangesRef.changes.size > 0) {
      // Get all pending changes - the build will process all of them at once
      const pendingChanges = Array.from(pendingChangesRef.changes.entries()).map(
        ([path, evtType]) => ({ path, eventType: evtType }),
      );
      pendingChangesRef.changes.clear();

      // Trigger another rebuild with all batched changes
      // The build() call will copy all static assets and rebuild all affected pages
      const [first, ...remaining] = pendingChanges;
      if (first) {
        void performIncrementalRebuild(
          first.path,
          first.eventType,
          configPath,
          staticDir,
          logger,
          wsServer,
          isBuildingRef,
          pendingChangesRef,
          onError,
          remaining, // Pass remaining changes as batched
        );
      }
    }
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
  } catch (_error) {
    try {
      // Fallback to full rebuild
      await build({
        logger,
        force: false,
        clean: false,
        ...(configPath && { configPath }),
      });
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Handles markdown file changes by comparing navigation hashes.
 * Only performs a full rebuild if navigation structure actually changed.
 * Navigation changes come from frontmatter modifications (title, order, description).
 * Content-only changes use incremental rebuilds.
 */
async function handleMarkdownChange(
  _markdownPath: string,
  configPath: string | undefined,
  logger: Logger,
): Promise<void> {
  const cacheDir = resolveCacheDir();

  try {
    // Load existing cache manifest
    const cacheManifest = await loadCacheManifest(cacheDir);

    if (!cacheManifest || !cacheManifest.navigationHash) {
      // No cache or no navigation hash exists, perform full rebuild
      await build({
        logger,
        force: false,
        clean: false,
        ...(configPath && { configPath }),
      });
      return;
    }

    // Load config and content to rebuild navigation tree
    const config = await loadConfig(configPath);
    const pages = await loadContent(config);
    const newNavigation = buildNavigation(pages);
    const newNavigationHash = computeNavigationHash(newNavigation);

    // Compare navigation hashes
    if (newNavigationHash !== cacheManifest.navigationHash) {
      // Navigation structure changed - clear cache and force full rebuild
      logger.info?.('📊 Navigation structure changed, performing full rebuild...');

      // Force rebuild bypasses ISG cache entirely
      await build({
        logger,
        force: true, // Force rebuild to bypass cache
        clean: false,
        ...(configPath && { configPath }),
      });
    } else {
      // Navigation unchanged - use incremental rebuild for content changes
      await build({
        logger,
        force: false,
        clean: false,
        ...(configPath && { configPath }),
      });
    }
  } catch (_error) {
    try {
      // Fallback to full rebuild
      await build({
        logger,
        force: false,
        clean: false,
        ...(configPath && { configPath }),
      });
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

export async function createDevServer(options: DevServerOptions = {}): Promise<DevServer> {
  const logger = options.logger ?? createFallbackLogger();
  const { configPath } = options;

  // Load configuration first to get defaults from config file
  const { config, outDir, srcDir, staticDir } = await loadDevConfig(configPath, logger);

  // Merge config values with options (options take precedence)
  const { port, host, open } = mergeServerOptions({
    options,
    config: config.dev,
    defaults: {
      port: DEFAULT_DEV_PORT,
      host: DEFAULT_DEV_HOST,
      open: false,
    },
  });

  setEnv('development');

  const url = `http://${host}:${port}`;
  let httpServer: ReturnType<typeof createServer> | null = null;
  let wsServer: WebSocketServer | null = null;

  // Track build errors for display in browser
  let lastBuildError: Error | null = null;

  // Function to set build errors for error overlay display
  const setLastBuildError = (error: Error | null) => {
    lastBuildError = error;
  };
  let watcher: FSWatcher | null = null;
  let cssWatcher: FSWatcher | null = null;
  let tsWatchers: BuildContext[] = [];
  const isBuildingRef = { value: false };
  const pendingChangesRef = { changes: new Map<string, 'add' | 'change' | 'unlink'>() };
  let isStopping = false;

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
      console.log('⚡ Reloading page due to file changes...');
      window.location.reload();
    }
  };
  ws.onclose = function() {
    // Suppress disconnection logs - not informative for users
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
    // Use the global build error
    const errorToShow = lastBuildError;

    // If there's a build error, show error overlay for HTML requests
    if (
      errorToShow &&
      (requestPath === '/' || requestPath.endsWith('.html') || !requestPath.includes('.'))
    ) {
      let errorDetails;

      // Use enhanced error details for TemplateError instances
      if (errorToShow instanceof TemplateError) {
        errorDetails = await errorToShow.toErrorDetails();
      } else {
        // Determine error type based on error message
        const message = errorToShow.message.toLowerCase();
        const name = errorToShow.name ? errorToShow.name.toLowerCase() : '';
        const errorType =
          message.includes('template') ||
          message.includes('eta') ||
          message.includes('layout') ||
          name.includes('template')
            ? 'template'
            : message.includes('front-matter') ||
                message.includes('yaml') ||
                name.includes('yaml') ||
                name.includes('yamlexception')
              ? 'markdown'
              : message.includes('config') || name.includes('config')
                ? 'config'
                : 'build';

        errorDetails = parseErrorDetails(errorToShow, errorType);
      }

      const errorHtml = createErrorOverlay(errorDetails, requestPath);
      return {
        content: errorHtml,
        mimeType: 'text/html',
        statusCode: 500,
      };
    }

    const originalFilePath = join(outDir, requestPath === '/' ? 'index.html' : requestPath);

    // Use the shared pretty URL resolver
    const { filePath, found } = await resolvePrettyUrl(outDir, requestPath, originalFilePath);

    if (!found || !filePath) {
      // If we have a build error and this is an HTML request, show error overlay instead of 404
      const errorToShow = lastBuildError;

      if (
        errorToShow &&
        (requestPath === '/' || requestPath.endsWith('.html') || !requestPath.includes('.'))
      ) {
        // Use enhanced error details for TemplateError instances
        let errorDetails;
        if (errorToShow instanceof TemplateError) {
          errorDetails = await errorToShow.toErrorDetails();
        } else {
          // Determine error type based on error message
          const message = errorToShow.message.toLowerCase();
          const name = errorToShow.name ? errorToShow.name.toLowerCase() : '';
          const errorType =
            message.includes('template') ||
            message.includes('eta') ||
            message.includes('layout') ||
            name.includes('template')
              ? 'template'
              : message.includes('front-matter') ||
                  message.includes('yaml') ||
                  name.includes('yaml') ||
                  name.includes('yamlexception')
                ? 'markdown'
                : message.includes('config') || name.includes('config')
                  ? 'config'
                  : 'build';

          errorDetails = parseErrorDetails(errorToShow, errorType);
        }

        const errorHtml = createErrorOverlay(errorDetails, requestPath);
        return {
          content: errorHtml,
          mimeType: 'text/html',
          statusCode: 500,
        };
      }

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
      await performInitialBuild(configPath, logger, setLastBuildError);

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
      if (getEnv() !== 'test') {
        try {
          wsServer = new WebSocketServer({
            server: httpServer,
            path: '/__ws',
          });

          wsServer.on('connection', (ws: unknown) => {
            // Suppress connection logs - not informative for users
            const websocket = ws as { on: (event: string, handler: () => void) => void };
            websocket.on('close', () => {
              // Suppress disconnection logs - not informative for users
            });
          });
        } catch (_error) {
          logger.warning?.('WebSocket server creation failed, live reload will not be available');
          wsServer = null;
        }
      }

      // Start HTTP server
      await new Promise<void>((resolve, reject) => {
        httpServer!.listen(port, host, () => {
          resolve();
        });

        httpServer!.on('error', (error: unknown) => {
          reject(error);
        });
      });

      // TypeScript watcher setup (initial compilation is handled by performInitialBuild)
      if (config.typescript?.enabled) {
        try {
          // Start TypeScript watchers for hot reload (one per bundle)
          tsWatchers = await createTypeScriptWatcher({
            projectRoot: process.cwd(),
            config: config.typescript,
            outDir: config.outDir || DEFAULT_OUT_DIR,
            logger,
            onRebuild: (_results, compileTimeMs) => {
              logger.info?.(`⚡ TypeScript recompiled in ${compileTimeMs}ms`);
              // Broadcast reload to WebSocket clients
              if (wsServer) {
                wsServer.clients.forEach((client: unknown) => {
                  const ws = client as { readyState: number; send: (data: string) => void };
                  if (ws.readyState === 1) {
                    // WebSocket.OPEN
                    ws.send(JSON.stringify({ type: 'reload' }));
                  }
                });
              }
            },
          });
        } catch (error) {
          const tsError = error instanceof Error ? error : new Error(String(error));
          // Prominent notification for TypeScript setup failure
          console.log();
          logger.error?.(`TypeScript setup failed: ${tsError.message}`);
          logger.warning?.('──────────────────────────────────────────────────────────────');
          logger.warning?.('⚠️  TypeScript hot reload is DISABLED for this session.');
          logger.warning?.(
            "    Dev server will continue, but TypeScript changes won't auto-reload.",
          );
          logger.warning?.('    Fix your TypeScript configuration and restart the dev server.');
          logger.warning?.('──────────────────────────────────────────────────────────────');
          console.log();
        }
      }

      // Set up file watching
      const watchPaths = [srcDir, staticDir].filter(Boolean);
      watcher = chokidar.watch(watchPaths, {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
      });

      // Set up separate watcher for CSS files in output directory
      // This enables live reload when external tools (like Tailwind CLI) update CSS
      cssWatcher = chokidar.watch([join(outDir, '**/*.css')], {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
      });

      cssWatcher.on('change', (path: string) => {
        const relativePath = path.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
        logger.info?.(`⚡ ${relativePath} updated`);

        // Just notify clients to reload - no rebuild needed since CSS was already compiled
        if (wsServer) {
          wsServer.clients.forEach((client: unknown) => {
            const ws = client as { readyState: number; send: (data: string) => void };
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ type: 'reload' }));
            }
          });
        }
      });

      watcher.on('change', (path: string) => {
        void performIncrementalRebuild(
          path,
          'change',
          configPath,
          staticDir,
          logger,
          wsServer,
          isBuildingRef,
          pendingChangesRef,
          setLastBuildError,
        );
      });

      watcher.on('add', (path: string) => {
        void performIncrementalRebuild(
          path,
          'add',
          configPath,
          staticDir,
          logger,
          wsServer,
          isBuildingRef,
          pendingChangesRef,
          setLastBuildError,
        );
      });

      watcher.on('unlink', (path: string) => {
        void performIncrementalRebuild(
          path,
          'unlink',
          configPath,
          staticDir,
          logger,
          wsServer,
          isBuildingRef,
          pendingChangesRef,
          setLastBuildError,
        );
      });

      logger.success?.(`Dev server running at ${url}`);
      logger.info?.(`\nServing:`);
      logger.info?.(`  📁 ${outDir}`);
      logger.info?.('Watching:');
      watchPaths.forEach((path) => logger.info?.(`  📁 ${path}`));
      logger.info?.('');

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
      if (isStopping) return;
      isStopping = true;
      if (watcher) {
        await watcher.close();
        watcher = null;
      }

      // Clean up CSS watcher
      if (cssWatcher) {
        await cssWatcher.close();
        cssWatcher = null;
      }

      // Clean up TypeScript watchers
      if (tsWatchers.length > 0) {
        await Promise.all(
          tsWatchers.map(async (w) => {
            try {
              await w.dispose();
            } catch (error) {
              logger.warning(`Failed to dispose TypeScript watcher: ${error}`);
            }
          }),
        );
        tsWatchers = [];
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

      logger.info?.('Dev server stopped');
    },
  };

  return devServer;
}
