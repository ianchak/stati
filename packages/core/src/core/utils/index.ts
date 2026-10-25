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
  lstat,
  realpath,
  readFileBuffer,
  readFileBufferSync,
  statSyncOrNull,
  listFilesRecursiveSync,
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
  normalizePathForComparison,
  isPathWithinDirectory,
  getPageOutputFile,
} from './paths.utils.js';

// Page list utilities (collection index pages, virtual pages, the not-found page)
export {
  isCollectionIndexPage,
  isVirtualPage,
  isNotFoundPage,
  isNotFoundUrl,
  getFirstPaginationPage,
  getCollectionPathForPage,
} from './template-discovery.utils.js';

// Template utilities
export { propValue } from './template.utils.js';

// Slugify utilities
export { slugify } from './slugify.utils.js';

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

// Front matter parsing
export { parseFrontMatter, FrontMatterError } from './front-matter.utils.js';
export type { ParsedFrontMatter } from './front-matter.utils.js';

// Template context validation utilities
export {
  createValidatingContextProxy,
  isPassthroughProperty,
  parseUnknownPropertyMessage,
  UnknownTemplatePropertyError,
} from './context-validation.utils.js';

// String similarity utilities
export { editDistance, findSimilarNames } from './similarity.utils.js';

// Template error utilities
export {
  TemplateError,
  TemplateUsageError,
  parseEtaError,
  createTemplateError,
} from './template-errors.utils.js';

// Navigation helper utilities
export { createNavigationHelpers } from './navigation-helpers.utils.js';

// Server utilities
export {
  getMimeType,
  parseRequestPath,
  resolveNotFoundPage,
  resolveRequestFile,
  resolvePrettyUrl,
  mergeServerOptions,
  assertPortAvailable,
  toPortUnavailableError,
  PortUnavailableError,
} from './server.utils.js';
export type {
  PrettyUrlResult,
  MergedServerOptions,
  MergeServerOptionsParams,
  PortUnavailableCode,
} from './server.utils.js';

// Error overlay utilities
export { createErrorOverlay, parseErrorDetails } from './error-overlay.utils.js';
export type { ErrorDetails } from './error-overlay.utils.js';

// Version utilities
export { getStatiVersion } from './version.utils.js';

// Glob pattern utilities
export { globToRegex, matchesGlob } from './glob-patterns.utils.js';

// Bundle matching utilities
export {
  matchBundlesForPage,
  getBundlePathsForPage,
  validateUniqueBundleNames,
  DuplicateBundleNameError,
} from './bundle-matching.utils.js';
export type { CompiledBundleInfo } from './bundle-matching.utils.js';

// Logger utilities
export { createFallbackLogger } from './logger.utils.js';

// TypeScript compilation utilities
export {
  compileTypeScript,
  createTypeScriptWatcher,
  compileStatiConfig,
  cleanupCompiledConfig,
  autoInjectBundles,
  formatBytes,
  detectExistingBundles,
  removeStaleBundleFiles,
} from './typescript.utils.js';
export type {
  CompileOptions,
  WatchOptions,
  RemoveStaleBundlesOptions,
} from './typescript.utils.js';

// HTML manipulation utilities
export { findHeadClosePosition, injectBeforeHeadClose } from './html.utils.js';

// Date utilities
export {
  describeDateValue,
  getFrontMatterDate,
  PUBLISHED_DATE_FIELDS,
  parseDateValue,
} from './date.utils.js';

// Environment utilities
export { isEnabledEnvFlag } from './env.utils.js';

// Dev-server CSS watcher utilities
export { discoverOutputCssFiles, refreshCssOutputWatcher } from './dev-css-watcher.utils.js';
export type { RefreshCssOutputWatcherParams } from './dev-css-watcher.utils.js';
