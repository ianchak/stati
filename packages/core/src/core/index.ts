/**
 * @fileoverview Core build engine exports
 * Barrel file for all core Stati functionality including build, dev server, preview, and invalidation.
 */

// Build functionality
export { build } from './build.js';
export type { BuildOptions, MetricsOptions, BuildResult } from './build.js';

// Development server
export { createDevServer } from './dev.js';
export type { DevServerOptions } from './dev.js';

// Preview server
export { createPreviewServer } from './preview.js';
export type { PreviewServerOptions } from './preview.js';

// Cache invalidation
export { invalidate } from './invalidate.js';
export type { InvalidationResult } from './invalidate.js';

// HTML utilities
export { injectBeforeHeadClose, findHeadClosePosition } from './utils/index.js';
