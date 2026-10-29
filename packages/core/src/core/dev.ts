import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import type { BuildContext } from 'esbuild';
import type { StatiConfig, Logger } from '../types/index.js';
import type { FSWatcher } from 'chokidar';
import { build } from './build.js';
import type { BuildOptions } from './build.js';
import { createStylesheetPlan } from '../css/index.js';
import type { TailwindBuildOptions } from '../css/index.js';
import { invalidate } from './invalidate.js';
import { loadConfig } from '../config/loader.js';
import { clearTemplateEngineCache } from './templates.js';
import {
  startTemplateIndexSession,
  endTemplateIndexSession,
  getCachedTemplateIndex,
  toTemplateFile,
} from './template-index.js';
import { clearMarkdownProcessorCache } from './markdown.js';
import {
  loadCacheManifest,
  saveCacheManifest,
  hasRecordedTemplates,
  DevServerLockManager,
} from './isg/index.js';
import {
  resolveDevPaths,
  resolveCacheDir,
  resolvePrettyUrl,
  resolveRequestFile,
  resolveNotFoundPage,
  getMimeType,
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
  normalizePathForComparison,
  assertPortAvailable,
  toPortUnavailableError,
  getBasePath,
  resolveBasePathRequest,
  respondToBasePathRequest,
} from './utils/index.js';
import type { ErrorDetails } from './utils/index.js';
import { setEnv, getEnv } from '../env.js';
import {
  DEFAULT_DEV_PORT,
  DEFAULT_DEV_HOST,
  DEFAULT_OUT_DIR,
  STALE_INPUTS_HASH,
} from '../constants.js';

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

/** What every dev server build gets besides its logger and rebuild flags */
type DevBuildOptions = Pick<BuildOptions, 'tailwind'>;

export interface DevServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  url: string;
}

/**
 * Loads and validates configuration for the dev server.
 */
async function loadDevConfig(
  logger: Logger,
): Promise<{ config: StatiConfig; outDir: string; srcDir: string; staticDir: string }> {
  // Load configuration
  try {
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
  buildOptions: DevBuildOptions,
  logger: Logger,
  onError?: (error: Error) => void,
): Promise<void> {
  try {
    // Clear cache to ensure fresh build on dev server start
    logger.status('Clearing cache for fresh development build...');
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
 * Performs incremental rebuild when files change, using ISG logic for smart rebuilds.
 * Uses a pending changes queue to ensure no file changes are lost when builds are in progress.
 *
 * @param changedPath - The path of the file that changed
 * @param eventType - The type of change: 'add', 'change', or 'unlink'
 * @param buildOptions - The config file path and Tailwind files every build gets
 * @param staticDir - The static assets directory path
 * @param srcDir - The source directory path, whose `.eta` files are templates
 * @param logger - Logger instance for output
 * @param wsServer - WebSocket server for live reload notifications
 * @param isBuildingRef - Mutable reference tracking whether a build is currently in progress
 * @param pendingChangesRef - Mutable reference holding queued file changes that occurred during an
 *   active build. The `changes` Map stores file paths as keys and their event types as values,
 *   ensuring each file is only processed once with its most recent event type.
 * @param onError - Optional callback invoked when build errors occur
 * @param onBuildEnd - Optional callback invoked after each build attempt finishes (success or failure)
 * @param hasBuildError - Whether the last build failed, so a template change rebuilds even when
 *   no recorded page uses the template
 * @param batchedChanges - Array of changes to process in a single batch (used for pending queue processing)
 */
async function performIncrementalRebuild(
  changedPath: string,
  eventType: 'add' | 'change' | 'unlink',
  buildOptions: DevBuildOptions,
  staticDir: string,
  srcDir: string,
  logger: Logger,
  wsServer: WebSocketServer | null,
  isBuildingRef: { value: boolean },
  pendingChangesRef: { changes: Map<string, 'add' | 'change' | 'unlink'> },
  onError?: (error: Error | null) => void,
  onBuildEnd?: () => Promise<void> | void,
  hasBuildError?: () => boolean,
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

  // Create a dev logger that shows progress for template rebuilds
  // but suppresses other verbose output
  const createDevLogger = (showProgress: boolean): Logger => {
    const baseLogger: Logger = {
      info: () => {}, // Suppress info messages
      success: () => {}, // Suppress success messages
      error: logger.error || (() => {}),
      warning: logger.warning || (() => {}),
      status: () => {}, // Suppress status messages
      building: () => {}, // Suppress building messages
      processing: () => {}, // Suppress processing messages
      stats: () => {}, // Suppress stats messages
    };

    // Enable progress tracking for template rebuilds (but not the full summary)
    if (showProgress && logger.startProgress && logger.updateProgress && logger.endProgress) {
      return {
        ...baseLogger,
        startProgress: logger.startProgress,
        updateProgress: logger.updateProgress,
        endProgress: logger.endProgress,
      };
    }

    return baseLogger;
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

  // Track template change result for better output
  let templateChangeResult: TemplateChangeResult | null = null;
  // Templates are .eta files in the source directory; other files are content or static assets
  const isTemplate = (path: string) => toTemplateFile(srcDir, path) !== null;
  const templateChanges = allChanges.filter((change) => isTemplate(change.path));
  const otherChanges = allChanges.filter((change) => !isTemplate(change.path));

  try {
    let rebuild: TemplateChangeResult['rebuild'] = 'none';
    if (templateChanges.length > 0) {
      templateChangeResult = await markTemplateChanges(
        templateChanges,
        srcDir,
        hasBuildError?.() ?? false,
      );
      rebuild = templateChangeResult.rebuild;
    }
    // Markdown and static files: ISG decides what re-renders, such as the pages that list a
    // changed page through a collection; the build also removes a deleted page's output
    if (otherChanges.length > 0 && rebuild === 'none') {
      rebuild = 'incremental';
    }

    if (rebuild !== 'none') {
      await build({
        // Progress output for template changes, which can rebuild many pages
        logger: createDevLogger(templateChanges.length > 0),
        force: rebuild === 'full',
        clean: false,
        // Template changes don't affect static assets
        ...(otherChanges.length === 0 && { skipAssetCopy: true }),
        ...buildOptions,
      });

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
    }

    const duration = Date.now() - startTime;

    // Log rebuild result with affected page info for template changes
    for (const change of allChanges) {
      const relativePath = getRelativePath(change.path);
      const template = templateChanges.includes(change);
      let action: string;
      if (change.eventType === 'unlink') {
        action = 'deleted';
      } else if (isStaticAsset(change.path)) {
        action = 'copied';
      } else if (template) {
        action = change.eventType === 'add' ? 'added' : 'changed';
      } else {
        action = 'rebuilt';
      }
      logger.info?.(`▸ ${relativePath} ${action}`);

      // For template changes, include affected page count
      if (template && templateChangeResult && rebuild !== 'none') {
        const { affectedPages, totalPages } = templateChangeResult;
        if (templateChangeResult.rebuild === 'full') {
          logger.info?.(`   All pages rebuilt in ${duration}ms`);
        } else if (affectedPages > 0) {
          logger.info?.(`   ${affectedPages}/${totalPages} pages rebuilt in ${duration}ms`);
        } else {
          logger.info?.(`   Done in ${duration}ms`);
        }
      } else if (template) {
        logger.info?.(change.eventType === 'unlink' ? '   No page used it' : '   No page uses it');
      } else {
        logger.info?.(`   Done in ${duration}ms`);
      }
    }
  } catch (error) {
    const buildError = error instanceof Error ? error : new Error(String(error));
    const duration = Date.now() - startTime;
    logger.error?.(`× Rebuild failed after ${duration}ms: ${buildError.message}`);

    // Store the error for display in browser
    if (onError) {
      onError(buildError);
    }
  } finally {
    isBuildingRef.value = false;

    if (onBuildEnd) {
      try {
        await onBuildEnd();
      } catch (error) {
        logger.error?.(
          `Failed post-build hook after rebuild: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Check if there are pending changes that occurred during this build
    if (pendingChangesRef.changes.size > 0) {
      // Get all pending changes - the build will process all of them at once
      const pendingChanges = Array.from(pendingChangesRef.changes.entries()).map(
        ([path, evtType]) => ({ path, eventType: evtType }),
      );
      pendingChangesRef.changes.clear();

      // Trigger another rebuild with all batched changes: every template change in the batch
      // updates the template index and marks its pages, then one build runs
      const [first, ...remaining] = pendingChanges;
      if (first) {
        void performIncrementalRebuild(
          first.path,
          first.eventType,
          buildOptions,
          staticDir,
          srcDir,
          logger,
          wsServer,
          isBuildingRef,
          pendingChangesRef,
          onError,
          onBuildEnd,
          hasBuildError,
          remaining, // Pass remaining changes as batched
        );
      }
    }
  }
}

/**
 * What template changes require
 */
interface TemplateChangeResult {
  /** Number of pages marked for rebuilding */
  affectedPages: number;
  /** Total pages in the site */
  totalPages: number;
  /** The build to run: none when no page uses the changed templates */
  rebuild: 'none' | 'incremental' | 'full';
}

/**
 * Applies template changes before a rebuild. Pages record the templates they rendered and the
 * names they looked up, so for each changed `.eta` file:
 * - change: the pages that rendered it rebuild; when none did, no page uses it.
 * - add: the template index learns the file, and the pages whose lookups now find it rebuild,
 *   such as the pages a new section override applies to.
 * - unlink: the index forgets the file, and the pages that rendered or found it rebuild.
 *
 * Affected entries are marked stale in the saved manifest. Entries without recorded templates
 * cannot say which pages use a file, so they get a forced full build.
 *
 * @param lastBuildFailed - Whether the previous build failed; then a build runs even when no
 *   recorded page uses the file, so the error clears once the template that broke it is fixed
 */
async function markTemplateChanges(
  changes: Array<{ path: string; eventType: 'add' | 'change' | 'unlink' }>,
  srcDir: string,
  lastBuildFailed: boolean,
): Promise<TemplateChangeResult> {
  // Drop the cached Eta engine so the changed templates are recompiled on the next build.
  // Markdown-only edits keep reusing it.
  clearTemplateEngineCache();

  // Keep the template index that dev builds reuse in step with the files
  const index = getCachedTemplateIndex(srcDir);
  for (const change of changes) {
    const file = toTemplateFile(srcDir, change.path);
    if (index && file) {
      if (change.eventType === 'add') {
        index.add(file);
      } else if (change.eventType === 'unlink') {
        index.remove(file);
      }
    }
  }

  try {
    const cacheDir = resolveCacheDir();
    const cacheManifest = await loadCacheManifest(cacheDir);
    if (!cacheManifest) {
      return { affectedPages: 0, totalPages: 0, rebuild: 'incremental' };
    }

    const entries = Object.entries(cacheManifest.entries);
    const totalPages = entries.length;
    if (entries.some(([, entry]) => !hasRecordedTemplates(entry))) {
      return { affectedPages: totalPages, totalPages, rebuild: 'full' };
    }

    // Normalized for comparison only: watcher paths and manifest paths can differ in form
    const changedFiles = new Set(changes.map((change) => normalizePathForComparison(change.path)));
    const filesAddedOrRemoved = changes.some((change) => change.eventType !== 'change');
    let affectedPages = 0;
    for (const [pagePath, entry] of entries) {
      const renderedChangedFile = entry.deps.some((dep) =>
        changedFiles.has(normalizePathForComparison(dep)),
      );
      const lookupsChanged =
        filesAddedOrRemoved && index !== null && index.lookupsChanged(entry.templateLookups);
      if (renderedChangedFile || lookupsChanged) {
        affectedPages++;
        // Forces a rebuild in shouldRebuildPage
        cacheManifest.entries[pagePath] = { ...entry, inputsHash: STALE_INPUTS_HASH };
      }
    }

    if (affectedPages > 0) {
      await saveCacheManifest(cacheDir, cacheManifest);
      return { affectedPages, totalPages, rebuild: 'incremental' };
    }
    // Before the session has an index, the build's own checks find the pages a new or deleted
    // file affects
    if ((filesAddedOrRemoved && index === null) || lastBuildFailed) {
      return { affectedPages: 0, totalPages, rebuild: 'incremental' };
    }
    return { affectedPages: 0, totalPages, rebuild: 'none' };
  } catch {
    // Let the build's own checks decide
    return { affectedPages: 0, totalPages: 0, rebuild: 'incremental' };
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
  const { config, outDir, srcDir, staticDir } = await loadDevConfig(logger);

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
  const hasLastBuildError = () => lastBuildError !== null;
  let watcher: FSWatcher | null = null;
  let cssWatcher: FSWatcher | null = null;
  let tsWatchers: BuildContext[] = [];
  const isBuildingRef = { value: false };
  const pendingChangesRef = { changes: new Map<string, 'add' | 'change' | 'unlink'>() };
  let isStopping = false;
  const watchedCssFiles = new Set<string>();

  // Diagnostics toggles used for investigating dev-server rebuild slowdown.
  const disableCssWatcher = isEnabledEnvFlag(process.env.STATI_DEV_DISABLE_CSS_WATCHER);
  const disableWsReload = isEnabledEnvFlag(process.env.STATI_DEV_DISABLE_WS_RELOAD);

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
      console.log('▸ Reloading page due to file changes...');
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
      const errorHtml = createErrorOverlay(await describeBuildError(errorToShow), requestPath);
      return {
        content: errorHtml,
        mimeType: 'text/html',
        statusCode: 500,
      };
    }

    // Security: the file the request names, or null when it is outside the output directory
    const requestFile = resolveRequestFile(outDir, requestPath);
    if (requestFile === null) {
      return {
        content: '403 - Forbidden',
        mimeType: 'text/plain',
        statusCode: 403,
      };
    }

    // Use the shared pretty URL resolver
    const { filePath, found } = await resolvePrettyUrl(outDir, requestPath, requestFile);

    if (!found || !filePath) {
      // Serve the site's 404 page, as static hosts do, with live reload so it updates on edits
      const notFoundPage = await resolveNotFoundPage(outDir);
      if (notFoundPage) {
        const html = await readFile(notFoundPage, 'utf-8');
        return {
          content: injectLiveReloadScript(html),
          mimeType: 'text/html',
          statusCode: 404,
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
              // Broadcast reload to WebSocket clients
              if (wsServer && !disableWsReload) {
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
        if (requestPath === '/__ws') {
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
        const hasFileExtension = sitePath.includes('.') && !sitePath.endsWith('.html');
        if (!hasFileExtension) {
          logger.processing?.(`${req.method} ${requestPath}`);
        }

        try {
          const { content, mimeType, statusCode } = await serveFile(sitePath);
          const responseTime = Date.now() - requestStart;

          // Log slow responses with memory info
          if (responseTime > 2000) {
            const mem = process.memoryUsage();
            const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
            const rssMB = Math.round(mem.rss / 1024 / 1024);
            logger.warning?.(
              `Slow response: ${requestPath} took ${responseTime}ms (heap: ${heapMB}MB, rss: ${rssMB}MB)`,
            );
          }

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
      try {
        await new Promise<void>((resolve, reject) => {
          httpServer!.listen(port, host, () => {
            resolve();
          });

          httpServer!.on('error', (error: unknown) => {
            reject(toPortUnavailableError(error, port, host, 'dev.port'));
          });
        });
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

      const refreshCssWatcher = async (): Promise<void> => {
        cssWatcher = await refreshCssOutputWatcher({
          outDir,
          logger,
          wsServer,
          disableWsReload,
          cssWatcher,
          watchedCssFiles,
        });
      };

      if (!disableCssWatcher) {
        await refreshCssWatcher();

        if (!cssWatcher) {
          logger.info?.('  • [dev] No CSS files found in output; CSS watcher not started');
        }
      }

      watcher.on('change', (path: string) => {
        void performIncrementalRebuild(
          path,
          'change',
          buildOptions,
          staticDir,
          srcDir,
          logger,
          disableWsReload ? null : wsServer,
          isBuildingRef,
          pendingChangesRef,
          setLastBuildError,
          disableCssWatcher ? undefined : refreshCssWatcher,
          hasLastBuildError,
        );
      });

      watcher.on('add', (path: string) => {
        void performIncrementalRebuild(
          path,
          'add',
          buildOptions,
          staticDir,
          srcDir,
          logger,
          disableWsReload ? null : wsServer,
          isBuildingRef,
          pendingChangesRef,
          setLastBuildError,
          disableCssWatcher ? undefined : refreshCssWatcher,
          hasLastBuildError,
        );
      });

      watcher.on('unlink', (path: string) => {
        void performIncrementalRebuild(
          path,
          'unlink',
          buildOptions,
          staticDir,
          srcDir,
          logger,
          disableWsReload ? null : wsServer,
          isBuildingRef,
          pendingChangesRef,
          setLastBuildError,
          disableCssWatcher ? undefined : refreshCssWatcher,
          hasLastBuildError,
        );
      });

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
