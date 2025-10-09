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
} from './fs.js';

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
} from './paths.js';

// Template discovery utilities
export {
  discoverLayout,
  isCollectionIndexPage,
  getCollectionPathForPage,
} from './template-discovery.js';

// Template utilities
export { propValue } from './template-utils.js';

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
} from './tailwind-inventory.js';

// Partial validation utilities
export { createValidatingPartialsProxy } from './partial-validation.js';

// Callable partial utilities
export { makeCallablePartial, wrapPartialsAsCallable } from './callable-partials.js';
export type { CallablePartial } from './callable-partials.js';

// Template error utilities
export { TemplateError, parseEtaError, createTemplateError } from './template-errors.js';

// Navigation helper utilities
export { createNavigationHelpers } from './navigation-helpers.js';

// Server utilities
export { resolvePrettyUrl } from './server.js';
export type { PrettyUrlResult } from './server.js';

// Error overlay utilities
export { createErrorOverlay, parseErrorDetails } from './error-overlay.js';
export type { ErrorDetails } from './error-overlay.js';

// Version utilities
export { getStatiVersion } from './version.js';
