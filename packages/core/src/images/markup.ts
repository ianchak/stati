/**
 * HTML for processed images.
 * @module images/markup
 */

import { escapeHtml } from '../core/utils/index.js';
import type { VariantPlan } from './plan.js';

/** Attributes Stati sets itself; authored values for these are ignored or handled separately. */
const MANAGED_ATTRIBUTES = new Set([
  'src',
  'srcset',
  'sizes',
  'alt',
  'title',
  'width',
  'height',
  'loading',
  'decoding',
  'fetchpriority',
]);

/**
 * Attributes for an `<img>` element.
 */
export interface ImgMarkupOptions {
  alt: string;
  title?: string | undefined;
  /** Other authored attributes, such as `class` or `id`, in order */
  attributes?: ReadonlyArray<readonly [string, string]> | undefined;
  width?: number | string | undefined;
  height?: number | string | undefined;
  /** Load eagerly with high fetch priority instead of lazily */
  eager?: boolean | undefined;
  srcset?: string | undefined;
  sizes?: string | undefined;
}

function attribute(name: string, value: string | number): string {
  return ` ${name}="${escapeHtml(String(value))}"`;
}

/**
 * Renders an `<img>` with dimensions, loading hints and authored attributes.
 *
 * @param src - Image URL
 * @param options - Attributes
 * @returns The `<img>` element
 */
export function renderImg(src: string, options: ImgMarkupOptions): string {
  let html = `<img${attribute('src', src)}`;
  if (options.srcset) html += attribute('srcset', options.srcset);
  if (options.sizes) html += attribute('sizes', options.sizes);
  html += attribute('alt', options.alt);
  if (options.title) html += attribute('title', options.title);
  for (const [name, value] of options.attributes ?? []) {
    if (!MANAGED_ATTRIBUTES.has(name.toLowerCase())) {
      html += attribute(name, value);
    }
  }
  if (options.width !== undefined) html += attribute('width', options.width);
  if (options.height !== undefined) html += attribute('height', options.height);
  html += options.eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
  return `${html} decoding="async">`;
}

/**
 * Renders a responsive image: a `<picture>` with one `<source>` per modern format, or a
 * plain `<img srcset>` when there are none.
 *
 * @param plan - The planned variants
 * @param options - Attributes for the `<img>` fallback
 * @param sizes - The `sizes` attribute
 * @returns The `<picture>` or `<img>` element
 */
export function renderResponsiveImage(
  plan: VariantPlan,
  options: Omit<ImgMarkupOptions, 'srcset' | 'sizes'>,
  sizes: string,
): string {
  const img = renderImg(plan.fallback.src, {
    ...options,
    srcset: plan.fallback.srcset,
    sizes,
  });
  if (plan.sources.length === 0) {
    return img;
  }
  const sources = plan.sources
    .map(
      (source) =>
        `<source${attribute('type', source.type)}${attribute('srcset', source.srcset)}${attribute('sizes', sizes)}>`,
    )
    .join('');
  return `<picture>${sources}${img}</picture>`;
}
