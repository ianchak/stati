/**
 * The template index: every `.eta` file under the source directory, and the name lookup that
 * `stati.include()`, `stati.layout()`, front matter `layout:`, layout discovery and the Open
 * Graph template share, so rendering and the ISG cache resolve every name the same way.
 * @module core/template-index
 */

import { posix, resolve } from 'node:path';
import glob from 'fast-glob';
import type { TemplateLookup } from '../types/index.js';
import { TEMPLATE_EXTENSION } from '../constants.js';
import { editDistance, findSimilarNames } from './utils/similarity.utils.js';

/**
 * A template name, parsed.
 * - `lookup`: `header` or `partials/header`, searched from the page's folder up to the source
 *   directory, nearest match first.
 * - `path`: one possible file, from `/partials/header` (`relative: false`) or from `./icon` and
 *   `../icons/arrow` resolved against the calling template (`relative: true`). `path` always
 *   starts with `/` and is relative to the source directory.
 * - `invalid`: a name that can never resolve, with the reason.
 */
export type TemplateName =
  | { kind: 'lookup'; name: string }
  | { kind: 'path'; path: string; relative: boolean }
  | { kind: 'invalid'; reason: string };

/**
 * Normalizes `/`-separated segments, dropping `.` and empty ones.
 *
 * @returns The normalized path, or null when `..` climbs above its start
 */
function normalizeSegments(path: string): string | null {
  const segments: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/');
}

/**
 * Parses a name passed to `stati.include()`, `stati.layout()`, `.has()` or front matter `layout:`.
 * Backslashes count as `/`, and an `.eta` suffix is dropped.
 *
 * @param raw - The name as written
 * @param callerFile - The calling template, relative to the source directory, or null for a
 *   template without a file (the built-in Open Graph template)
 */
export function parseTemplateName(raw: unknown, callerFile: string | null): TemplateName {
  if (typeof raw !== 'string') {
    return { kind: 'invalid', reason: `must be a string, not ${describeValue(raw)}` };
  }
  let name = raw.replace(/\\/g, '/');
  if (name.endsWith(TEMPLATE_EXTENSION)) {
    name = name.slice(0, -TEMPLATE_EXTENSION.length);
  }
  if (name === '') {
    return { kind: 'invalid', reason: 'is empty' };
  }
  if (/^[a-zA-Z]:/.test(name)) {
    return {
      kind: 'invalid',
      reason: 'is a file system path; use a path inside the source directory',
    };
  }
  if (name.endsWith('/')) {
    return { kind: 'invalid', reason: 'ends with "/"; name a template file' };
  }

  if (name.startsWith('/')) {
    const path = normalizeSegments(name);
    if (path === null) {
      return { kind: 'invalid', reason: 'resolves outside the source directory' };
    }
    if (path === '') {
      return { kind: 'invalid', reason: 'names the source directory, not a template' };
    }
    return { kind: 'path', path: `/${path}`, relative: false };
  }

  if (name === '.' || name === '..' || name.startsWith('./') || name.startsWith('../')) {
    if (callerFile === null) {
      return {
        kind: 'invalid',
        reason:
          'is relative, and the built-in Open Graph template has no file to resolve it from; use a path such as "partials/card" instead',
      };
    }
    const path = normalizeSegments(`${posix.dirname(callerFile.replace(/\\/g, '/'))}/${name}`);
    if (path === null) {
      return { kind: 'invalid', reason: 'resolves outside the source directory' };
    }
    if (path === '') {
      return { kind: 'invalid', reason: 'names a folder, not a template' };
    }
    return { kind: 'path', path: `/${path}`, relative: true };
  }

  const normalized = normalizeSegments(name);
  if (normalized === null) {
    return { kind: 'invalid', reason: 'resolves outside the source directory' };
  }
  return { kind: 'lookup', name: normalized };
}

function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value === 'object' ? 'an object' : `${typeof value} ${String(value)}`;
}

/**
 * The folder of a file relative to the source directory, `''` for the source directory itself.
 * Paths outside the source directory count as the source directory.
 *
 * @param relativeFile - A path relative to the source directory, with `/` or `\` separators
 */
export function templateFolderOf(relativeFile: string): string {
  const file = relativeFile.replace(/\\/g, '/');
  if (
    file.startsWith('../') ||
    file === '..' ||
    posix.isAbsolute(file) ||
    /^[a-zA-Z]:/.test(file)
  ) {
    return '';
  }
  const dir = posix.dirname(file);
  return dir === '.' ? '' : posix.normalize(dir);
}

/**
 * The folders a looked-up name is searched in, nearest first: the folder itself, each parent,
 * then the source directory (`''`).
 */
export function lookupFolders(from: string): string[] {
  const folders: string[] = [];
  let dir = from;
  while (dir !== '') {
    folders.push(dir);
    const parent = posix.dirname(dir);
    dir = parent === '.' ? '' : parent;
  }
  folders.push('');
  return folders;
}

/**
 * A `./` or `../` name that reaches `target` from `fromFolder`, both relative to the source
 * directory. Pure string work, unlike `path.relative`, which resolves against the process's
 * working directory.
 *
 * @example
 * ```typescript
 * relativeTemplateName('partials', 'partials/icon'); // './icon'
 * relativeTemplateName('blog/2024', 'blog/post');     // '../post'
 * relativeTemplateName('', 'layout');                 // './layout'
 * ```
 */
export function relativeTemplateName(fromFolder: string, target: string): string {
  const from = fromFolder === '' ? [] : fromFolder.split('/');
  const to = target.split('/');
  let common = 0;
  while (common < from.length && common < to.length - 1 && from[common] === to[common]) {
    common++;
  }
  const rest = to.slice(common).join('/');
  const ups = from.length - common;
  return ups === 0 ? `./${rest}` : `${'../'.repeat(ups)}${rest}`;
}

/** The template file for a name in a folder. */
function candidateFile(folder: string, name: string): string {
  return folder === '' ? `${name}${TEMPLATE_EXTENSION}` : `${folder}/${name}${TEMPLATE_EXTENSION}`;
}

/**
 * Converts an absolute path to the index's form: relative to the source directory, `/`
 * separators. Returns null for files outside it and for files that are not templates.
 *
 * @param srcDir - Absolute source directory
 * @param absolutePath - Absolute path of a file, with either separator
 */
export function toTemplateFile(srcDir: string, absolutePath: string): string | null {
  const base = srcDir.replace(/\\/g, '/').replace(/\/+$/, '');
  const path = absolutePath.replace(/\\/g, '/');
  const caseInsensitive = /^[a-zA-Z]:/.test(base);
  const comparablePath = caseInsensitive ? path.toLowerCase() : path;
  const comparableBase = caseInsensitive ? base.toLowerCase() : base;
  if (!comparablePath.startsWith(`${comparableBase}/`)) {
    return null;
  }
  const relative = posix.normalize(path.slice(base.length + 1));
  if (relative.startsWith('../') || !relative.endsWith(TEMPLATE_EXTENSION)) {
    return null;
  }
  return relative;
}

/**
 * Whether a value read from the cache manifest is a list of template lookups.
 */
export function isTemplateLookupList(value: unknown): value is TemplateLookup[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false;
      const { name, from, file } = item as Record<string, unknown>;
      return (
        typeof name === 'string' &&
        (from === undefined || typeof from === 'string') &&
        (file === null || typeof file === 'string')
      );
    })
  );
}

/**
 * How a page's layout was chosen, from {@link TemplateIndex.resolvePageLayout}.
 */
export interface PageLayoutResolution {
  /** The layout file, relative to the source directory, or null when no layout applies */
  file: string | null;
  /** The lookups that chose it, for the page's cache entry */
  lookups: TemplateLookup[];
  /**
   * A front matter `layout:` value that names no template: the value, why, and templates it
   * could have meant. Layout discovery chose `file` instead.
   */
  unresolvedFrontMatter?: {
    value: unknown;
    problem: string;
    suggestions: string[];
  };
}

/**
 * Every `.eta` file under a source directory, with memoised name lookups.
 * Paths are relative to the source directory, with `/` separators and the `.eta` extension.
 */
export class TemplateIndex {
  private readonly templates: Set<string>;
  private readonly lookupCache = new Map<string, string | null>();
  private sorted: string[] | null = null;

  /**
   * @param srcDir - Absolute source directory
   * @param files - Template files relative to it
   */
  constructor(
    readonly srcDir: string,
    files: Iterable<string>,
  ) {
    this.templates = new Set();
    for (const file of files) {
      this.templates.add(file.replace(/\\/g, '/'));
    }
  }

  /**
   * Globs the source directory once for its templates.
   *
   * @param srcDir - Absolute source directory
   */
  static async load(srcDir: string): Promise<TemplateIndex> {
    const files = await glob(`**/*${TEMPLATE_EXTENSION}`, {
      cwd: srcDir,
      onlyFiles: true,
      ignore: ['**/node_modules/**'],
    });
    return new TemplateIndex(srcDir, files);
  }

  /** Number of templates */
  get size(): number {
    return this.templates.size;
  }

  /** Whether a template file exists, given relative to the source directory */
  has(file: string): boolean {
    return this.templates.has(file);
  }

  /** Every template file, sorted */
  files(): readonly string[] {
    this.sorted ??= [...this.templates].sort();
    return this.sorted;
  }

  /**
   * Adds a template, for a file created during a dev session.
   *
   * @returns Whether the index changed
   */
  add(file: string): boolean {
    if (!file.endsWith(TEMPLATE_EXTENSION) || this.templates.has(file)) {
      return false;
    }
    this.templates.add(file);
    this.invalidate();
    return true;
  }

  /**
   * Removes a template, for a file deleted during a dev session.
   *
   * @returns Whether the index changed
   */
  remove(file: string): boolean {
    if (!this.templates.delete(file)) {
      return false;
    }
    this.invalidate();
    return true;
  }

  private invalidate(): void {
    this.lookupCache.clear();
    this.sorted = null;
  }

  /**
   * Finds the nearest template for a looked-up name, searching `from` and then each parent
   * folder up to the source directory.
   *
   * @param name - A normalized looked-up name, such as `partials/header`
   * @param from - The folder to start in, relative to the source directory
   * @returns The template file, or null when no folder has one
   */
  lookup(name: string, from: string): string | null {
    const key = `${from}\0${name}`;
    const cached = this.lookupCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    let found: string | null = null;
    for (const folder of lookupFolders(from)) {
      const file = candidateFile(folder, name);
      if (this.templates.has(file)) {
        found = file;
        break;
      }
    }
    this.lookupCache.set(key, found);
    return found;
  }

  /**
   * Resolves a parsed name for a page.
   *
   * @param name - A parsed, valid name
   * @param pageFolder - The page's folder, where looked-up names start
   * @returns The file (or null) and the lookup to record
   */
  resolve(
    name: Exclude<TemplateName, { kind: 'invalid' }>,
    pageFolder: string,
  ): { file: string | null; lookup: TemplateLookup } {
    if (name.kind === 'path') {
      const candidate = `${name.path.slice(1)}${TEMPLATE_EXTENSION}`;
      const file = this.templates.has(candidate) ? candidate : null;
      return { file, lookup: { name: name.path, file } };
    }
    const file = this.lookup(name.name, pageFolder);
    return { file, lookup: { name: name.name, from: pageFolder, file } };
  }

  /**
   * Resolves a recorded lookup again, for the cache. Lookups with a `from` folder are searched
   * like looked-up names; the others are a single path.
   *
   * @returns The file the lookup would resolve to now, or null
   */
  resolveRecorded(lookup: TemplateLookup): string | null {
    if (lookup.from === undefined) {
      const candidate = `${lookup.name.replace(/^\/+/, '')}${TEMPLATE_EXTENSION}`;
      return this.templates.has(candidate) ? candidate : null;
    }
    return this.lookup(lookup.name, lookup.from);
  }

  /**
   * Whether any recorded lookup would now resolve to a different file than it did.
   */
  lookupsChanged(lookups: readonly TemplateLookup[] | undefined): boolean {
    return (lookups ?? []).some((lookup) => this.resolveRecorded(lookup) !== lookup.file);
  }

  /**
   * Names a template could have meant, for an unknown name: templates with the same base name
   * first, then similar names, written the way the name was written.
   *
   * @param name - The unknown name, parsed
   * @param pageFolder - The page's folder
   * @param callerFile - The calling template, relative to the source directory
   * @param limit - Maximum number of suggestions
   */
  suggest(
    name: Exclude<TemplateName, { kind: 'invalid' }>,
    pageFolder: string,
    callerFile: string | null,
    limit = 3,
  ): string[] {
    const withoutExtension = (file: string) => file.slice(0, -TEMPLATE_EXTENSION.length);
    const candidates = new Map<string, string>();

    if (name.kind === 'lookup') {
      // The names this page can reach: each file, relative to each folder it could be found from
      const folders = lookupFolders(pageFolder);
      for (const file of this.files()) {
        for (const folder of folders) {
          if (folder === '' || file.startsWith(`${folder}/`)) {
            const reachable = withoutExtension(
              folder === '' ? file : file.slice(folder.length + 1),
            );
            if (!candidates.has(reachable)) candidates.set(reachable, reachable);
          }
        }
      }
    } else {
      const callerFolder = callerFile === null ? '' : templateFolderOf(callerFile);
      for (const file of this.files()) {
        const path = `/${withoutExtension(file)}`;
        const written = name.relative
          ? relativeTemplateName(callerFolder, withoutExtension(file))
          : path;
        candidates.set(path, written);
      }
    }

    // A template with the same file name in another folder (a moved file, or a name without
    // its folder), then a misspelt file name in the same folder; nearest first
    const target = name.kind === 'lookup' ? name.name : name.path;
    const targetBase = posix.basename(target);
    const targetFolder = posix.dirname(target);
    const others = [...candidates.keys()].filter((candidate) => candidate !== target);
    const byDistance = (a: string, b: string) =>
      editDistance(target, a) - editDistance(target, b) || a.localeCompare(b);
    const sameBase = others
      .filter((candidate) => posix.basename(candidate) === targetBase)
      .sort(byDistance);
    const sameFolder = others.filter((candidate) => posix.dirname(candidate) === targetFolder);
    const similarBases = new Set(
      findSimilarNames(
        targetBase,
        sameFolder.map((candidate) => posix.basename(candidate)),
        limit,
      ),
    );
    const misspelt = sameFolder
      .filter((candidate) => similarBases.has(posix.basename(candidate)))
      .sort(byDistance);
    return [...new Set([...sameBase, ...misspelt])]
      .slice(0, limit)
      .map((candidate) => candidates.get(candidate)!);
  }

  /**
   * Picks a page's layout: its front matter `layout:` when that names a template, otherwise the
   * nearest `layout.eta`, or for index pages the nearest `index.eta` or `layout.eta`, whichever
   * is in a nearer folder (`index.eta` first within a folder).
   *
   * @param pageFile - The page's Markdown file, relative to the source directory
   * @param frontMatterLayout - The page's front matter `layout:` value
   * @param isIndexPage - Whether the page lists a collection, which enables `index.eta`
   */
  resolvePageLayout(
    pageFile: string,
    frontMatterLayout: unknown,
    isIndexPage: boolean,
  ): PageLayoutResolution {
    const pageFolder = templateFolderOf(pageFile);
    const lookups: TemplateLookup[] = [];
    let unresolvedFrontMatter: PageLayoutResolution['unresolvedFrontMatter'];
    // YAML reads `layout: 404` as a number
    const layoutName =
      typeof frontMatterLayout === 'number' ? String(frontMatterLayout) : frontMatterLayout;
    const callerFile = pageFile.replace(/\\/g, '/');

    if (layoutName !== undefined && layoutName !== null && layoutName !== '') {
      const parsed = parseTemplateName(layoutName, callerFile);
      if (parsed.kind === 'invalid') {
        unresolvedFrontMatter = { value: layoutName, problem: parsed.reason, suggestions: [] };
      } else {
        const resolved = this.resolve(parsed, pageFolder);
        lookups.push(resolved.lookup);
        if (resolved.file !== null) {
          return { file: resolved.file, lookups };
        }
        unresolvedFrontMatter = {
          value: layoutName,
          problem: 'names no template',
          suggestions: this.suggest(parsed, pageFolder, callerFile),
        };
      }
    }

    const discovered = this.discoverLayout(pageFolder, isIndexPage, lookups);
    return { file: discovered, lookups, ...(unresolvedFrontMatter && { unresolvedFrontMatter }) };
  }

  private discoverLayout(
    pageFolder: string,
    isIndexPage: boolean,
    lookups: TemplateLookup[],
  ): string | null {
    const layout = this.lookup('layout', pageFolder);
    lookups.push({ name: 'layout', from: pageFolder, file: layout });
    if (!isIndexPage) {
      return layout;
    }
    const index = this.lookup('index', pageFolder);
    lookups.push({ name: 'index', from: pageFolder, file: index });
    if (index === null || layout === null) {
      return index ?? layout;
    }
    // The nearer folder wins; within one folder index.eta comes first
    const depth = (file: string) => {
      const folder = templateFolderOf(file);
      return folder === '' ? 0 : folder.split('/').length;
    };
    return depth(index) >= depth(layout) ? index : layout;
  }
}

/**
 * The index of a dev server session, which its file watcher keeps current as templates are
 * added and deleted, so rebuilds reuse it. It lives outside the cached Eta engine, which every
 * template change drops. Other builds read the source directory each time.
 */
let session: { srcDir: string; index: TemplateIndex | null } | null = null;

/**
 * Starts a dev server session for a source directory: builds reuse one index, and the dev
 * server updates it on file events.
 */
export function startTemplateIndexSession(srcDir: string): void {
  session = { srcDir: resolve(srcDir), index: null };
}

/**
 * Ends the dev server session; later builds read the source directory again.
 */
export function endTemplateIndexSession(): void {
  session = null;
}

/**
 * Returns the template index for a build: the session's while a dev server watches the
 * source directory, otherwise a new one.
 *
 * @param srcDir - Absolute source directory
 */
export async function loadTemplateIndex(srcDir: string): Promise<TemplateIndex> {
  if (session && session.srcDir === resolve(srcDir)) {
    session.index ??= await TemplateIndex.load(srcDir);
    return session.index;
  }
  return TemplateIndex.load(srcDir);
}

/**
 * The dev server session's index for a source directory, or null when there is none yet.
 */
export function getCachedTemplateIndex(srcDir: string): TemplateIndex | null {
  return session && session.srcDir === resolve(srcDir) ? session.index : null;
}
