import { join } from 'node:path';
import type { StatiConfig } from '../types/index.js';
import { ConfigValidationError } from './errors.js';
import {
  resolveSrcDir,
  resolveOutDir,
  resolveStaticDir,
  resolveCacheDir,
  normalizePathForComparison,
} from '../core/utils/paths.utils.js';
import { DEFAULT_OUT_DIR, DEFAULT_TS_SRC_DIR } from '../constants.js';

/** File systems on these platforms treat `Site` and `site` as one folder by default. */
const CASE_INSENSITIVE_PLATFORMS = new Set(['win32', 'darwin']);

function comparable(path: string): string {
  const normalized = normalizePathForComparison(path);
  return CASE_INSENSITIVE_PLATFORMS.has(process.platform) ? normalized.toLowerCase() : normalized;
}

/** Whether `inner` is `outer` or a folder below it. */
function isSameOrInside(outer: string, inner: string): boolean {
  const prefix = outer.endsWith('/') ? outer : `${outer}/`;
  return inner === outer || inner.startsWith(prefix);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** The path resolvers fall back to the default folder for both `undefined` and `null`. */
function isUnsetOrString(value: unknown): boolean {
  return value === undefined || value === null || isString(value);
}

/**
 * Checks that `outDir` is a folder Stati can fill and empty without touching anything else.
 * `stati build --clean` removes `outDir` with everything in it, and every build writes pages
 * into it, so it must not be, contain or sit inside a folder that holds the site's own files:
 * the project folder, `srcDir`, `staticDir`, `typescript.srcDir` (when TypeScript is enabled)
 * and the `.stati` cache folder.
 *
 * Paths resolve against the current working directory, as the build does.
 *
 * @param config - The merged configuration
 * @throws {ConfigValidationError} Naming `outDir` and the folder it collides with
 */
export function validateDirectoryLayout(config: StatiConfig): void {
  // Options of another type are reported by the checks that own them
  if (!isUnsetOrString(config.outDir)) return;

  const outDir = resolveOutDir(config);
  const out = comparable(outDir);
  const label = `outDir '${config.outDir ?? DEFAULT_OUT_DIR}' (${outDir})`;

  const root = process.cwd();
  if (isSameOrInside(out, comparable(root))) {
    throw new ConfigValidationError(
      `${label} is the project folder or one of its parents. ` +
        `Use a folder inside the project, such as outDir: 'dist'.`,
    );
  }

  const protectedDirs: Array<{ name: string; path: string }> = [];
  if (isUnsetOrString(config.srcDir)) {
    protectedDirs.push({ name: 'srcDir', path: resolveSrcDir(config) });
  }
  if (isUnsetOrString(config.staticDir)) {
    protectedDirs.push({ name: 'staticDir', path: resolveStaticDir(config) });
  }
  if (config.typescript?.enabled) {
    const tsSrcDir = config.typescript.srcDir ?? DEFAULT_TS_SRC_DIR;
    if (isString(tsSrcDir)) {
      protectedDirs.push({ name: 'typescript.srcDir', path: join(root, tsSrcDir) });
    }
  }
  protectedDirs.push({ name: 'the .stati cache folder', path: resolveCacheDir() });

  for (const { name, path } of protectedDirs) {
    const protectedPath = comparable(path);
    if (isSameOrInside(out, protectedPath)) {
      throw new ConfigValidationError(
        `${label} is or contains ${name} (${path}). ` +
          `Building would write pages over its files, and 'stati build --clean' would delete them. ` +
          `Choose a separate output folder, such as outDir: 'dist'.`,
      );
    }
    if (isSameOrInside(protectedPath, out)) {
      throw new ConfigValidationError(
        `${label} is inside ${name} (${path}). ` +
          `Pages would be written among the site's own files. ` +
          `Choose an output folder outside it, such as outDir: 'dist'.`,
      );
    }
  }
}
