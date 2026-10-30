import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import type { BuildContext } from 'esbuild';
import type { Logger } from '../types/index.js';
import type { FSWatcher } from 'chokidar';
import { build } from './build.js';
import { createStylesheetPlan } from '../css/index.js';
import type { TailwindBuildOptions } from '../css/index.js';
import { invalidate } from './invalidate.js';
import { clearTemplateEngineCache } from './templates.js';
import { startTemplateIndexSession, endTemplateIndexSession } from './template-index.js';
import { clearMarkdownProcessorCache } from './markdown.js';
import { DevServerLockManager } from './isg/index.js';
import { loadServerConfig } from './server-config.js';
import { createRebuildQueue } from './rebuild-queue.js';
import { rebuildChanges } from './dev-rebuild.js';
import type { DevBuildOptions } from './dev-rebuild.js';
import {
  resolveCacheDir,
  parseRequestPath,
  createErrorOverlay,
  parseErrorDetails,
  TemplateError,
  FrontMatterError,
  createFallbackLogger,
  mergeServerOptions,
  createTypeScriptWatcher,
  isEnabledEnvFlag,
  refreshCssOutputWatcher,
  assertPortAvailable,
  listenOnPort,
  openInBrowser,
  isPageRequest,
  createStaticFileServer,
  createReloadBroadcaster,
  injectLiveReloadScript,
  LIVE_RELOAD_PATH,
  getBasePath,
  resolveBasePathRequest,
  respondToBasePathRequest,
} from './utils/index.js';
import type { ErrorDetails } from './utils/index.js';
import { setEnv, getEnv } from '../env.js';
import { DEFAULT_DEV_PORT, DEFAULT_DEV_HOST, DEFAULT_OUT_DIR } from '../constants.js';

export interface DevServerOptions {
  port?: number;
  host?: string;
  open?: boolean;
  logger?: Logger;
  /**
   * The Tailwind CSS input and output the CLI's watcher uses (`--tailwind-input` and
   * `--tailwind-output`). Pages link the output under its path in the output directory.
   */
  tailwind?: TailwindBuildOptions;
}

export interface DevServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  url: string;
}

/**
 * Performs an initial build to ensure dist/ exists
 */
async function performInitialBuild(
  buildOptions: DevBuildOptions,
  logger: Logger,
  onError?: (error: Error) => void,
): Promise<void> {
  try {
    // Clear cache to ensure fresh build on dev server start
    logger.status('Invalidating cache for fresh development build...');
    await invalidate();

    await build({
      logger,
      force: false,
      clean: false,
      ...buildOptions,
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
 * The error overlay's details for a failed build: template errors point at the template and
 * front matter errors at the Markdown file; other errors are classified by their message.
 */
async function describeBuildError(error: Error): Promise<ErrorDetails> {
  if (error instanceof TemplateError) {
    return error.toErrorDetails();
  }
  if (error instanceof FrontMatterError) {
    // The file and line are the Markdown file's, not a stack frame's
    const {
      line: _line,
      column: _column,
      ...details
    } = parseErrorDetails(error, 'markdown', error.filePath);
    return {
      ...details,
      ...(error.line !== undefined && { line: error.line }),
      ...(error.column !== undefined && { column: error.column }),
    };
  }

  const message = error.message.toLowerCase();
  const name = error.name ? error.name.toLowerCase() : '';
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

  return parseErrorDetails(error, errorType);
}

export async function createDevServer(options: DevServerOptions = {}): Promise<DevServer> {
  const logger = options.logger ?? createFallbackLogger();

  // Load configuration first to get defaults from config file
  const { config, outDir, srcDir, staticDir } = await loadServerConfig(logger);

  // Pages link the Tailwind watcher's output when it is a stylesheet in the output directory.
  // Other outputs still work as before, but Stati can't link them.
  let { tailwind } = options;
  if (tailwind) {
    try {
      createStylesheetPlan(tailwind, config.css, outDir, true);
    } catch (error) {
      logger.warning?.(
        `${error instanceof Error ? error.message : String(error)} Stati does not link the stylesheet to pages.`,
      );
      tailwind = undefined;
    }
  }
  const buildOptions: DevBuildOptions = {
    ...(tailwind && { tailwind }),
  };

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

  // Create dev server lock manager
  const cacheDir = resolveCacheDir();
  const devLock = new DevServerLockManager(cacheDir);

  // The site is served under the path of site.baseUrl, so links behave as they do in production
  const basePath = getBasePath(config.site.baseUrl);
  const url = `http://${host}:${port}${basePath ? `${basePath}/` : ''}`;
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
  let isStopping = false;
  const watchedCssFiles = new Set<string>();

  // Diagnostics toggles used for investigating dev-server rebuild slowdown.
  const disableCssWatcher = isEnabledEnvFlag(process.env.STATI_DEV_DISABLE_CSS_WATCHER);
  const disableWsReload = isEnabledEnvFlag(process.env.STATI_DEV_DISABLE_WS_RELOAD);

  // Every reload goes through the live reload socket, once the server has one
  const reload = createReloadBroadcaster(() => wsServer, { disabled: disableWsReload });

  const refreshCssWatcher = async (): Promise<void> => {
    // A build that finishes after stop() must not start a watcher nothing closes
    if (isStopping) {
      return;
    }
    const nextCssWatcher = await refreshCssOutputWatcher({
      outDir,
      logger,
      reload,
      cssWatcher,
      watchedCssFiles,
    });
    // stop() can run during the scan, and closes only the watcher it finds
    if (isStopping) {
      await nextCssWatcher?.close();
      cssWatcher = null;
      return;
    }
    cssWatcher = nextCssWatcher;
  };

  // One build at a time: the files that change while it runs are built together after it
  const rebuildQueue = createRebuildQueue({
    runBuild: (changes) =>
      rebuildChanges(changes, {
        srcDir,
        staticDir,
        buildOptions,
        logger,
        hasBuildError: () => lastBuildError !== null,
      }),
    ...(!disableCssWatcher && { onBuildEnd: refreshCssWatcher }),
    onError: setLastBuildError,
    reload,
    logger,
  });

  const socketUrl = `ws://${host}:${port}${LIVE_RELOAD_PATH}`;
  const fileServer = createStaticFileServer({
    outDir,
    logger,
    // While the last build failed, pages show the error overlay
    interceptHtml: async (sitePath) => {
      const error = lastBuildError;
      if (!error) {
        return null;
      }
      return {
        content: createErrorOverlay(await describeBuildError(error), sitePath),
        mimeType: 'text/html',
        statusCode: 500,
      };
    },
    // Pages reload when the site changes, the 404 page included
    transformHtml: (html) => injectLiveReloadScript(html, socketUrl),
  });

  const devServer: DevServer = {
    url,

    async start(): Promise<void> {
      // Fail fast if the port is taken, before acquiring the lock or running the initial build
      await assertPortAvailable(port, host, 'dev.port');

      // Acquire dev server lock to prevent multiple dev servers in the same directory
      try {
        await devLock.acquireLock();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error?.(`Failed to start dev server:\n${message}`);
        throw error;
      }

      // TypeScript watcher setup
      // Start this before the initial build so bundle outputs already exist for auto-injection.
      if (config.typescript?.enabled) {
        try {
          // Start TypeScript watchers for hot reload (one per bundle)
          tsWatchers = await createTypeScriptWatcher({
            projectRoot: process.cwd(),
            config: config.typescript,
            outDir: config.outDir || DEFAULT_OUT_DIR,
            logger,
            awaitInitialBuild: true,
            onRebuild: (_results, compileTimeMs) => {
              logger.info?.(`▸ TypeScript recompiled in ${compileTimeMs}ms`);
              reload();
            },
          });
        } catch (error) {
          const tsError = error instanceof Error ? error : new Error(String(error));
          // Prominent notification for TypeScript setup failure
          console.log();
          logger.error?.(`TypeScript setup failed: ${tsError.message}`);
          logger.warning?.('──────────────────────────────────────────────────────────────');
          logger.warning?.('!  TypeScript hot reload is DISABLED for this session.');
          logger.warning?.(
            "    Dev server will continue, but TypeScript changes won't auto-reload.",
          );
          logger.warning?.('    Fix your TypeScript configuration and restart the dev server.');
          logger.warning?.('──────────────────────────────────────────────────────────────');
          console.log();
        }
      }

      // Rebuilds reuse one template index, which the file watcher keeps current
      startTemplateIndexSession(srcDir);
      await performInitialBuild(buildOptions, logger, setLastBuildError);

      // Create HTTP server
      httpServer = createServer(async (req, res) => {
        const requestPath = parseRequestPath(req.url);
        const requestStart = Date.now();

        // Handle WebSocket upgrade path
        if (requestPath === LIVE_RELOAD_PATH) {
          return; // Let WebSocket server handle this
        }

        if (requestPath === null) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('400 - Bad Request');
          return;
        }

        // With a base path, the site lives under it, as it does on the host
        const target = resolveBasePathRequest(req.url, requestPath, basePath);
        if (target.kind !== 'serve') {
          respondToBasePathRequest(res, target, basePath);
          return;
        }
        const sitePath = target.path;

        // Only log page requests, not static assets (files with extensions)
        if (isPageRequest(sitePath)) {
          logger.processing?.(`${req.method} ${requestPath}`);
        }

        await fileServer.respond(res, sitePath);

        // Log slow responses with memory info
        const responseTime = Date.now() - requestStart;
        if (responseTime > 2000) {
          const mem = process.memoryUsage();
          const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
          const rssMB = Math.round(mem.rss / 1024 / 1024);
          logger.warning?.(
            `Slow response: ${requestPath} took ${responseTime}ms (heap: ${heapMB}MB, rss: ${rssMB}MB)`,
          );
        }
      });

      // Create WebSocket server for live reload
      if (getEnv() !== 'test') {
        try {
          wsServer = new WebSocketServer({
            server: httpServer,
            path: LIVE_RELOAD_PATH,
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
      try {
        await listenOnPort(httpServer, port, host, 'dev.port');
      } catch (error) {
        // Release the lock and watchers acquired above so a failed start doesn't leak them.
        // The HTTP server never started listening, so there is nothing to close.
        httpServer = null;
        await devServer.stop();
        throw error;
      }

      // Set up file watching
      const watchPaths = [srcDir, staticDir].filter(Boolean);
      watcher = chokidar.watch(watchPaths, {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
      });

      if (!disableCssWatcher) {
        await refreshCssWatcher();

        if (!cssWatcher) {
          logger.info?.('  • [dev] No CSS files found in output; CSS watcher not started');
        }
      }

      // Every added, changed or deleted file goes through the rebuild queue
      for (const eventType of ['add', 'change', 'unlink'] as const) {
        watcher.on(eventType, (path: string) => {
          void rebuildQueue.enqueue(path, eventType);
        });
      }

      logger.success?.(`Dev server running at ${url}`);
      logger.info?.(`\nServing:`);
      logger.info?.(`  • ${outDir}`);
      logger.info?.('Watching:');
      watchPaths.forEach((path) => logger.info?.(`  • ${path}`));
      if (disableCssWatcher) {
        logger.info?.('  • [diagnostic] CSS output watcher disabled');
      }
      if (disableWsReload) {
        logger.info?.('  • [diagnostic] WebSocket reload broadcast disabled');
      }
      logger.info?.('');

      // Open browser if requested
      if (open) {
        await openInBrowser(url, logger);
      }
    },

    async stop(): Promise<void> {
      if (isStopping) return;
      isStopping = true;

      // Release dev server lock first to allow other servers to start
      await devLock.releaseLock();

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

      // Release cached dev-session engines so they can be garbage collected
      clearTemplateEngineCache();
      endTemplateIndexSession(srcDir);
      clearMarkdownProcessorCache();

      logger.info?.('Dev server stopped');
    },
  };

  return devServer;
}
