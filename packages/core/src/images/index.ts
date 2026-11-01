/**
 * @fileoverview Image pipeline exports
 * Intrinsic sizes, lazy loading and co-located images in core, plus the plumbing for
 * responsive variants and Open Graph images rendered by `@stati/images`.
 */

export { resolveImagesConfig, validateImagesConfig } from './config.js';
export type { ResolvedImagesConfig, ResolvedResponsiveConfig, ResolvedOgConfig } from './config.js';
export { ImageRuntime, PageImages, validateOgBaseUrl } from './runtime.js';
export type { StatiImageOptions } from '../types/index.js';
export type { SettleResult, ImageRuntimeOptions, OgTemplateRenderer } from './runtime.js';
export { installImageRule, selectEagerImage } from './markdown-rule.js';
export { loadImageProvider, resolveImagesPackage, missingPackageMessage } from './provider.js';
export { probeImage } from './utils/index.js';
export type { ImageProbeResult } from './utils/index.js';
