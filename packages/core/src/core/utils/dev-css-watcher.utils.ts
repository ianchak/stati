import chokidar from 'chokidar';
import { glob } from 'tinyglobby';
import type { FSWatcher } from 'chokidar';
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

export interface RefreshCssOutputWatcherParams {
  outDir: string;
  logger: Logger;
  /** Reloads the open pages when a watched file changes */
  reload: () => void;
  cssWatcher: FSWatcher | null;
  watchedCssFiles: Set<string>;
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
  const { outDir, logger, reload, cssWatcher, watchedCssFiles } = params;

  const cssFiles = await discoverOutputCssFiles(outDir);
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

  nextCssWatcher.on('change', (path: string) => {
    const relativePath = path.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
    logger.info?.(`▸ ${relativePath} updated`);
    reload();
  });

  return nextCssWatcher;
}
