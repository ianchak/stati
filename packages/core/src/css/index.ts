/**
 * The stylesheet Stati builds with Tailwind CSS: Tailwind runs after the last page renders,
 * production names the file after its content, and pages link it.
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
  getHashedStylesheetPattern,
  rebaseRelativeUrls,
  buildStylesheet,
  getStaleStylesheetPaths,
  relinkStylesheet,
  removeStaleStylesheets,
  linksStylesheet,
  autoInjectStylesheets,
} from './stylesheet.js';
export type { TailwindBuildOptions, StylesheetPlan, BuiltStylesheet } from './stylesheet.js';
