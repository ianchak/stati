/**
 * ISG (Incremental Static Generation) Module
 *
 * This module provides intelligent caching and incremental rebuild capabilities for Stati.
 * It tracks page dependencies, computes content hashes, and manages TTL-based rebuild strategies.
 *
 * @module isg
 */

// Manifest management
export { loadCacheManifest, saveCacheManifest, createEmptyManifest } from './manifest.js';

// Build decision logic
export { shouldRebuildPage, createCacheEntry, updateCacheEntry } from './builder.js';

// Build locking
export { BuildLockManager, withBuildLock } from './build-lock.js';

// Dependency tracking
export {
  CircularDependencyError,
  trackTemplateDependencies,
  findPartialDependencies,
  resolveTemplatePath,
} from './deps.js';

// Hash computation
export {
  computeContentHash,
  computeFileHash,
  computeInputsHash,
  computeNavigationHash,
} from './hash.js';

// TTL and aging
export {
  getSafeCurrentTime,
  parseSafeDate,
  computeEffectiveTTL,
  computeNextRebuildAt,
  isPageFrozen,
  applyAgingRules,
} from './ttl.js';

// Validation
export {
  ISGConfigurationError,
  validateISGConfig,
  validatePageISGOverrides,
  extractNumericOverride,
} from './validation.js';
