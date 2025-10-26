/**
 * Core utilities index
 * @module core/utils
 */

// File system utilities
export {
  readFile,
  writeFile,
  pathExists,
  ensureDir,
  remove,
  copyFile,
  readdir,
  stat,
} from './fs.utils.js';

// Path resolution utilities
export {
  resolveSrcDir,
  resolveOutDir,
  resolveStaticDir,
  resolveCacheDir,
  resolveDevPaths,
  normalizeTemplatePath,
  resolveSrcPath,
  resolveOutPath,
  resolveStaticPath,
} from './paths.utils.js';

// Template discovery utilities
export {
  discoverLayout,
  isCollectionIndexPage,
  getCollectionPathForPage,
} from './template-discovery.utils.js';

// Template utilities
export { propValue } from './template.utils.js';

// Tailwind inventory utilities
export {
  trackTailwindClass,
  enableInventoryTracking,
  disableInventoryTracking,
  clearInventory,
  getInventory,
  getInventorySize,
  isTrackingEnabled,
  writeTailwindClassInventory,
  isTailwindUsed,
  resetTailwindDetection,
  loadPreviousInventory,
} from './tailwind-inventory.utils.js';

// Partial validation utilities
export { createValidatingPartialsProxy } from './partial-validation.utils.js';

// Callable partial utilities
export { makeCallablePartial, wrapPartialsAsCallable } from './callable-partials.utils.js';
export type { CallablePartial } from './callable-partials.utils.js';

// Template error utilities
export { TemplateError, parseEtaError, createTemplateError } from './template-errors.utils.js';

// Navigation helper utilities
export { createNavigationHelpers } from './navigation-helpers.utils.js';

// Server utilities
export { resolvePrettyUrl, mergeServerOptions } from './server.utils.js';
export type {
  PrettyUrlResult,
  MergedServerOptions,
  MergeServerOptionsParams,
} from './server.utils.js';

// Error overlay utilities
export { createErrorOverlay, parseErrorDetails } from './error-overlay.utils.js';
export type { ErrorDetails } from './error-overlay.utils.js';

// Version utilities
export { getStatiVersion } from './version.utils.js';

// Glob pattern utilities
export { globToRegex, matchesGlob } from './glob-patterns.utils.js';

// Logger utilities
export { createFallbackLogger } from './logger.utils.js';
