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
export {
  shouldRebuildPage,
  createCacheEntry,
  updateCacheEntry,
  hasRecordedReads,
  hasRecordedTemplates,
} from './builder.js';
export type { RenderedAssets } from './builder.js';

// Removal of pages that no longer exist
export { pruneOrphanedPages } from './prune.js';

// Build locking
export { BuildLockManager, withBuildLock } from './build-lock.js';
export { DevServerLockManager } from './dev-server-lock.js';

// The layout a page renders with; every other template is recorded while it renders
export { resolveLayoutDependency } from './deps.js';

// Hash computation
export {
  computeContentHash,
  computeFileHash,
  computeBinaryFileHash,
  computeInputsHash,
  computeNavigationHash,
  clearFileHashCache,
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
