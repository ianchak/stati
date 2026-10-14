/**
 * @fileoverview `@stati/images`: responsive AVIF/WebP images and generated Open Graph images
 * for Stati. `@stati/core` loads this package when `images.responsive` or `images.og` is on;
 * it decides URLs, widths and caching, and this package only encodes.
 */

import type { ImageProvider } from '@stati/core/types';
import { createVariants } from './variants.js';
import { renderOgImage } from './og/render.js';
import { loadOgDefaults } from './og/defaults.js';
import { PACKAGE_VERSION, createLimiter, defaultConcurrency, loadSharp } from './runtime.js';

/**
 * Options for {@link createImageProvider}.
 */
export interface ImageProviderOptions {
  /** Maximum number of images encoded at once (default: half the CPUs, at most 3) */
  concurrency?: number;
}

/**
 * Creates the image provider `@stati/core` uses to encode responsive variants and render
 * Open Graph images.
 *
 * @param options - Provider options
 * @returns The provider
 * @throws {Error} When sharp's native binary cannot be loaded on this platform
 */
export async function createImageProvider(
  options: ImageProviderOptions = {},
): Promise<ImageProvider> {
  const sharp = await loadSharp();
  const limit = createLimiter(options.concurrency ?? defaultConcurrency());

  return {
    apiVersion: 1,
    version: `@stati/images@${PACKAGE_VERSION} sharp@${sharp.versions.sharp}`,
    createVariants: (request) => createVariants(sharp, request, limit),
    renderOgImage: (request) => limit(() => renderOgImage(sharp, request)),
    loadOgDefaults,
  };
}
