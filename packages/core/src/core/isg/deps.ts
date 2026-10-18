import { posix, relative } from 'node:path';
import { isCollectionIndexPage } from '../utils/index.js';
import type { PageModel } from '../../types/index.js';
import type { TemplateIndex } from '../template-index.js';

/**
 * Resolves the layout a page renders with, in the form stored as the first entry of its
 * cache dependencies. Uses the same lookup as rendering, so callers can tell whether the
 * page's layout has changed since it rendered, for example when a collection gains its first
 * child page and switches to `index.eta`.
 *
 * The other templates a page uses are recorded while it renders.
 *
 * @param page - The page model to resolve the layout for
 * @param allPages - All pages in the site, used to detect collection index pages the same way rendering does
 * @param index - The build's template index
 * @returns Absolute path to the layout file (POSIX format), or null if no layout applies
 */
export function resolveLayoutDependency(
  page: PageModel,
  allPages: PageModel[],
  index: TemplateIndex,
): string | null {
  const { file } = index.resolvePageLayout(
    relative(index.srcDir, page.sourcePath).replace(/\\/g, '/'),
    page.frontMatter.layout,
    isCollectionIndexPage(page, allPages),
  );

  // Normalize to POSIX format for consistent manifest output across platforms
  return file ? posix.join(index.srcDir.replace(/\\/g, '/'), file) : null;
}
