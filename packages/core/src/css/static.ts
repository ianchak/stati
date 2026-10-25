/**
 * Hashed copies of the stylesheets in the static directory that production pages link.
 * @module css/static
 */

import { dirname, join } from 'node:path';
import { ensureDir, readFile, stat, writeFile } from '../core/utils/fs.utils.js';
import { getStylesheetReferences, hashStylesheet, isHashableStylesheetPath } from './stylesheet.js';

/**
 * The stylesheets from the static directory a production build links under hashed names.
 * The first page that links a stylesheet has its copy written as
 * `_assets/[folder/]name-HASH.css`; the static copy still writes the file under its own
 * name, for `@import`s and scripts that load it.
 */
export class StaticStylesheets {
  private readonly copies = new Map<string, Promise<string | undefined>>();

  /**
   * @param staticDir - The static directory, absolute
   * @param outDir - The output directory, absolute
   * @param skipPath - A path the static directory doesn't serve: the Tailwind output's, whose
   *   static file the build doesn't copy, and which a hashed build doesn't write, so a
   *   stylesheet that references it stops the build
   * @param basePath - The path the site is served from (`getBasePath()`), which the copy's
   *   rebased `url()`s start with
   */
  constructor(
    private readonly staticDir: string,
    private readonly outDir: string,
    private readonly skipPath?: string,
    private readonly basePath: string = '',
  ) {}

  /**
   * The hashed copy's path for a stylesheet path, which the first call writes.
   *
   * @param path - A path from the site root, such as '/styles.css'
   * @returns The copy's path, such as '/_assets/styles-A1B2C3D4.css', or undefined when the
   *   static directory has no such .css file or its path can't be linked as it is
   * @throws {Error} When the stylesheet references the Tailwind output
   */
  resolve(path: string): Promise<string | undefined> {
    let copy = this.copies.get(path);
    if (!copy) {
      copy = this.writeCopy(path);
      this.copies.set(path, copy);
    }
    return copy;
  }

  /** The stylesheets hashed so far, each path with its copy's path */
  async hashed(): Promise<Map<string, string>> {
    const entries = await Promise.all(
      [...this.copies].map(async ([path, copy]) => [path, await copy] as const),
    );
    return new Map(
      entries.filter((entry): entry is readonly [string, string] => entry[1] !== undefined),
    );
  }

  private async writeCopy(path: string): Promise<string | undefined> {
    if (path === this.skipPath || !isHashableStylesheetPath(path)) {
      return undefined;
    }
    const source = join(this.staticDir, ...path.split('/'));
    const info = await stat(source).catch(() => null);
    const css = info?.isFile() ? await readFile(source) : null;
    if (css === null) {
      return undefined;
    }
    if (this.skipPath && getStylesheetReferences(css, path).includes(this.skipPath)) {
      throw new Error(
        `${path} in the static directory references ${this.skipPath}, the Tailwind CSS output. A hashed build writes that stylesheet only under a hashed name, so the reference would load nothing. Import the stylesheet in the Tailwind input instead, link both stylesheets from the page, or set css.hash to false.`,
      );
    }

    const hashed = hashStylesheet(css, path, this.basePath);
    const file = join(this.outDir, ...hashed.path.split('/'));
    await ensureDir(dirname(file));
    await writeFile(file, hashed.css, 'utf-8');
    return hashed.path;
  }
}
