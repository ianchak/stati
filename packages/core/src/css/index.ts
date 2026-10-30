/**
 * Hashed stylesheets. Stati builds one with Tailwind CSS after the last page renders, and
 * production builds name it, and the static directory's stylesheets pages link, after their
 * content and point the pages' links at those names.
 *
 * @module css
 */

export { validateCSSConfig, resolveCSSConfig } from './config.js';
export type { ResolvedCSSConfig } from './config.js';

export { findTailwindCli, runTailwindCLI } from './tailwind.js';
export type { RunTailwindOptions } from './tailwind.js';

export {
  createStylesheetPlan,
  checkStylesheetSources,
  getStylesheetFingerprint,
  getRenderStylesheetPath,
  rebaseRelativeUrls,
  getStylesheetReferences,
  hashStylesheet,
  isHashableStylesheetPath,
  buildStylesheet,
  getStaleStylesheetPaths,
  relinkStylesheets,
  removeStaleStylesheets,
  linksStylesheet,
  autoInjectStylesheets,
  getLinkedStylesheetPaths,
  linksStylesheetWithIntegrity,
  rewriteStylesheetLinks,
} from './stylesheet.js';
export type { TailwindBuildOptions, StylesheetPlan, BuiltStylesheet } from './stylesheet.js';

export { StaticStylesheets } from './static.js';

export { StylesheetRuntime } from './runtime.js';
export type { StylesheetRuntimeOptions, StylesheetRenderInputs } from './runtime.js';
