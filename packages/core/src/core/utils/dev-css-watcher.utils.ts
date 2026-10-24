import chokidar from 'chokidar';
import { glob } from 'tinyglobby';
import type { FSWatcher } from 'chokidar';
import type { WebSocketServer } from 'ws';
import type { Logger } from '../../types/index.js';
import { pathExists } from './fs.utils.js';

/**
 * Returns concrete CSS files currently present in outDir.
 *
 * Watching explicit files avoids a broad recursive outDir glob watcher,
 * which can add significant overhead on large docs sites.
 */
export async function discoverOutputCssFiles(outDir: string): Promise<string[]> {
  if (!(await pathExists(outDir))) {
    return [];
  }

  const cssFiles = await glob('**/*.css', {
    cwd: outDir,
    absolute: true,
    onlyFiles: true,
    dot: false,
    expandDirectories: false,
  });

  return cssFiles;
}

function hasSameMembership(nextFiles: string[], watchedCssFiles: Set<string>): boolean {
  if (nextFiles.length !== watchedCssFiles.size) {
    return false;
  }
  return nextFiles.every((file) => watchedCssFiles.has(file));
}

function broadcastReload(
  wsServer: WebSocketServer | null,
  disableWsReload: boolean,
  payload: string,
): void {
  if (!wsServer || disableWsReload) {
    return;
  }

  wsServer.clients.forEach((client: unknown) => {
    const ws = client as { readyState: number; send: (data: string) => void };
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  });
}

export interface RefreshCssOutputWatcherParams {
  outDir: string;
  logger: Logger;
  wsServer: WebSocketServer | null;
  disableWsReload: boolean;
  cssWatcher: FSWatcher | null;
  watchedCssFiles: Set<string>;
  /**
   * Stylesheets to watch whether or not they exist yet, such as the output of the CLI's
   * Tailwind watcher, which starts after the dev server and after a production build has
   * deleted the file
   */
  expectedCssFiles?: readonly string[];
}

/**
 * Reconciles the CSS watcher with the current output CSS file membership.
 *
 * If the file set changed, this closes the previous watcher and creates a new one
 * bound to the latest concrete files.
 */
export async function refreshCssOutputWatcher(
  params: RefreshCssOutputWatcherParams,
): Promise<FSWatcher | null> {
  const { outDir, logger, wsServer, disableWsReload, cssWatcher, watchedCssFiles } = params;

  // Forward slashes, like the discovered files, so an expected file is listed once
  const expected = (params.expectedCssFiles ?? []).map((file) => file.replace(/\\/g, '/'));
  const cssFiles = [...new Set([...(await discoverOutputCssFiles(outDir)), ...expected])];
  if (hasSameMembership(cssFiles, watchedCssFiles)) {
    return cssWatcher;
  }

  if (cssWatcher) {
    await cssWatcher.close();
  }

  watchedCssFiles.clear();
  cssFiles.forEach((file) => watchedCssFiles.add(file));

  if (cssFiles.length === 0) {
    return null;
  }

  const nextCssWatcher = chokidar.watch(cssFiles, {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  const reload = (path: string) => {
    const relativePath = path.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
    logger.info?.(`▸ ${relativePath} updated`);
    broadcastReload(wsServer, disableWsReload, JSON.stringify({ type: 'reload' }));
  };
  nextCssWatcher.on('change', reload);
  // An expected stylesheet that did not exist yet
  nextCssWatcher.on('add', reload);

  return nextCssWatcher;
}
