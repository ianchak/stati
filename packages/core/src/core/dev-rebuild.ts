import type { Logger } from '../types/index.js';
import { build } from './build.js';
import type { BuildOptions } from './build.js';
import { clearTemplateEngineCache } from './templates.js';
import { getCachedTemplateIndex, toTemplateFile } from './template-index.js';
import { loadCacheManifest, saveCacheManifest, hasRecordedTemplates } from './isg/index.js';
import { markStale } from './isg/stale.js';
import { resolveCacheDir, normalizePathForComparison } from './utils/index.js';
import type { FileChange } from './rebuild-queue.js';

/** What every dev server build gets besides its logger and rebuild flags */
export type DevBuildOptions = Pick<BuildOptions, 'tailwind'>;

/**
 * What template changes require
 */
export interface TemplateChangeResult {
  /** Number of pages marked for rebuilding */
  affectedPages: number;
  /** Total pages in the site */
  totalPages: number;
  /** The build to run: none when no page uses the changed templates */
  rebuild: 'none' | 'incremental' | 'full';
}

/** A change in a batch, with the kind of file that changed */
export interface SortedChange extends FileChange {
  /** An `.eta` file in the source directory */
  template: boolean;
  /** A file in the static directory */
  staticAsset: boolean;
}

/** What a batch of changes needs */
export interface RebuildPlan {
  /** The build to run: none when the batch only changed templates no page uses */
  rebuild: TemplateChangeResult['rebuild'];
  /** Whether the build copies the static assets, which template changes alone leave as they are */
  copyAssets: boolean;
  /** Whether the build shows its progress, as template changes can rebuild many pages */
  showProgress: boolean;
}

/** How a batch went, for the log */
export interface RebuildOutcome {
  /** What the template changes required, or null when the batch changed no template */
  templateResult: TemplateChangeResult | null;
  /** The build that ran */
  rebuild: RebuildPlan['rebuild'];
  /** How long the batch took */
  durationMs: number;
}

/** What a batch of changes is rebuilt with */
export interface RebuildContext {
  /** The source directory, whose `.eta` files are templates */
  srcDir: string;
  /** The static assets directory */
  staticDir: string;
  /** The Tailwind files every build gets */
  buildOptions: DevBuildOptions;
  /** The dev server's logger */
  logger: Logger;
  /**
   * Whether the last build failed, so a template change rebuilds even when no recorded page
   * uses the template
   */
  hasBuildError: () => boolean;
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
export async function markTemplateChanges(
  changes: FileChange[],
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
        cacheManifest.entries[pagePath] = markStale(entry);
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
 * Sorts each change by the kind of file: templates are `.eta` files in the source directory,
 * static assets are the files in the static directory, and the rest is content.
 */
export function sortChanges(
  changes: FileChange[],
  srcDir: string,
  staticDir: string,
): SortedChange[] {
  const normalizedStaticDir = staticDir.replace(/\\/g, '/');
  return changes.map((change) => ({
    ...change,
    template: toTemplateFile(srcDir, change.path) !== null,
    staticAsset: change.path.replace(/\\/g, '/').startsWith(normalizedStaticDir),
  }));
}

/**
 * Plans the build for a batch of changes. A batch that changes Markdown or static files always
 * builds: ISG decides what re-renders, such as the pages that list a changed page through a
 * collection, and the build removes a deleted page's output.
 *
 * @param templateResult - What the batch's template changes require, or null when it has none
 * @param hasOtherChanges - Whether the batch changed files that are not templates
 */
export function planRebuild(
  templateResult: TemplateChangeResult | null,
  hasOtherChanges: boolean,
): RebuildPlan {
  let rebuild = templateResult?.rebuild ?? 'none';
  if (hasOtherChanges && rebuild === 'none') {
    rebuild = 'incremental';
  }
  return { rebuild, copyAssets: hasOtherChanges, showProgress: templateResult !== null };
}

/**
 * The lines the dev server logs for a batch: each changed file and what happened to it, then
 * how many pages a template change rebuilt, or that no page uses the template.
 *
 * @param changes - The batch
 * @param outcome - What the batch required and how long it took
 * @param cwd - The project directory, which the logged paths are relative to
 */
export function describeRebuild(
  changes: SortedChange[],
  outcome: RebuildOutcome,
  cwd: string,
): string[] {
  const { templateResult, rebuild, durationMs } = outcome;
  const lines: string[] = [];
  for (const change of changes) {
    const relativePath = change.path.replace(cwd, '').replace(/\\/g, '/').replace(/^\//, '');
    let action: string;
    if (change.eventType === 'unlink') {
      action = 'deleted';
    } else if (change.staticAsset) {
      action = 'copied';
    } else if (change.template) {
      action = change.eventType === 'add' ? 'added' : 'changed';
    } else {
      action = 'rebuilt';
    }
    lines.push(`▸ ${relativePath} ${action}`);

    // For template changes, include affected page count
    if (change.template && templateResult && rebuild !== 'none') {
      const { affectedPages, totalPages } = templateResult;
      if (templateResult.rebuild === 'full') {
        lines.push(`   All pages rebuilt in ${durationMs}ms`);
      } else if (affectedPages > 0) {
        lines.push(`   ${affectedPages}/${totalPages} pages rebuilt in ${durationMs}ms`);
      } else {
        lines.push(`   Done in ${durationMs}ms`);
      }
    } else if (change.template) {
      lines.push(change.eventType === 'unlink' ? '   No page used it' : '   No page uses it');
    } else {
      lines.push(`   Done in ${durationMs}ms`);
    }
  }
  return lines;
}

/**
 * The logger rebuilds run with: the build's errors and warnings, and its progress when
 * `showProgress` is set, but not its other output or the build summary.
 */
export function createRebuildLogger(logger: Logger, showProgress: boolean): Logger {
  const rebuildLogger: Logger = {
    info: () => {}, // Suppress info messages
    success: () => {}, // Suppress success messages
    error: logger.error || (() => {}),
    warning: logger.warning || (() => {}),
    status: () => {}, // Suppress status messages
    building: () => {}, // Suppress building messages
    processing: () => {}, // Suppress processing messages
    stats: () => {}, // Suppress stats messages
  };

  if (showProgress && logger.startProgress && logger.updateProgress && logger.endProgress) {
    return {
      ...rebuildLogger,
      startProgress: logger.startProgress,
      updateProgress: logger.updateProgress,
      endProgress: logger.endProgress,
    };
  }

  return rebuildLogger;
}

/**
 * Rebuilds the site for a batch of changes, using ISG to re-render only the pages they affect,
 * and logs each changed file. The rebuild queue runs one batch at a time.
 *
 * @returns Whether a build ran; false when the batch only changed templates no page uses
 */
export async function rebuildChanges(
  changes: FileChange[],
  context: RebuildContext,
): Promise<boolean> {
  const { srcDir, staticDir, buildOptions, logger, hasBuildError } = context;
  const startTime = Date.now();
  const sortedChanges = sortChanges(changes, srcDir, staticDir);
  const templateChanges = sortedChanges.filter((change) => change.template);
  const hasOtherChanges = sortedChanges.some((change) => !change.template);

  const templateResult =
    templateChanges.length > 0
      ? await markTemplateChanges(templateChanges, srcDir, hasBuildError())
      : null;
  const plan = planRebuild(templateResult, hasOtherChanges);

  if (plan.rebuild !== 'none') {
    await build({
      logger: createRebuildLogger(logger, plan.showProgress),
      force: plan.rebuild === 'full',
      clean: false,
      ...(!plan.copyAssets && { skipAssetCopy: true }),
      ...buildOptions,
    });
  }

  const outcome = { templateResult, rebuild: plan.rebuild, durationMs: Date.now() - startTime };
  for (const line of describeRebuild(sortedChanges, outcome, process.cwd())) {
    logger.info?.(line);
  }
  return plan.rebuild !== 'none';
}
