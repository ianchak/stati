/**
 * Validation and defaults for the `images` configuration block.
 * @module images/config
 */

import type { ImageVariantFormat, OgImageFontConfig, StatiConfig } from '../types/index.js';
import { ConfigValidationError } from '../config/errors.js';
import {
  DEFAULT_IMAGE_FORMATS,
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_IMAGE_SIZES,
  DEFAULT_IMAGE_WIDTHS,
  DEFAULT_OG_HEIGHT,
  DEFAULT_OG_TEMPLATE,
  DEFAULT_OG_WIDTH,
} from '../constants.js';

/** Responsive image options with defaults applied. */
export interface ResolvedResponsiveConfig {
  /** Candidate widths, ascending and unique */
  widths: number[];
  formats: ImageVariantFormat[];
  quality: { avif: number; webp: number; jpeg: number; png?: number };
  sizes: string;
}

/** Open Graph image options with defaults applied. */
export interface ResolvedOgConfig {
  template: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  fonts: OgImageFontConfig[];
  exclude: string[];
}

/** The `images` block with defaults applied. */
export interface ResolvedImagesConfig {
  eagerFirst: boolean;
  /** `null` when responsive images are off */
  responsive: ResolvedResponsiveConfig | null;
  /** `null` when Open Graph images are off */
  og: ResolvedOgConfig | null;
  dev: 'fast' | 'full';
}

const IMAGES_KEYS = ['eagerFirst', 'responsive', 'og', 'dev'];
const RESPONSIVE_KEYS = ['widths', 'formats', 'quality', 'sizes'];
const QUALITY_KEYS = ['avif', 'webp', 'jpeg', 'png'];
const OG_KEYS = ['template', 'width', 'height', 'format', 'fonts', 'exclude'];
const FONT_KEYS = ['name', 'path', 'weight', 'style'];
const VARIANT_FORMATS: readonly string[] = ['avif', 'webp'];
const MAX_IMAGE_WIDTH = 16384;
const MAX_OG_SIZE = 4096;

function fail(message: string): never {
  throw new ConfigValidationError(message);
}

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkKeys(value: Record<string, unknown>, allowed: string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail(`Unknown option ${path}.${key}. Allowed options: ${allowed.join(', ')}.`);
    }
  }
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function validateResponsive(value: unknown): void {
  if (typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    fail(`images.responsive must be true, false or an object (got ${describe(value)}).`);
  }
  checkKeys(value, RESPONSIVE_KEYS, 'images.responsive');

  if (value.widths !== undefined) {
    if (
      !Array.isArray(value.widths) ||
      value.widths.length === 0 ||
      !value.widths.every((w) => isIntegerInRange(w, 1, MAX_IMAGE_WIDTH))
    ) {
      fail(
        `images.responsive.widths must be a non-empty array of whole pixel widths between 1 and ${MAX_IMAGE_WIDTH} (got ${describe(value.widths)}).`,
      );
    }
  }

  if (value.formats !== undefined) {
    if (
      !Array.isArray(value.formats) ||
      !value.formats.every((f) => typeof f === 'string' && VARIANT_FORMATS.includes(f))
    ) {
      fail(
        `images.responsive.formats must be an array of 'avif' and 'webp' (got ${describe(value.formats)}).`,
      );
    }
  }

  if (value.quality !== undefined) {
    if (!isPlainObject(value.quality)) {
      fail(`images.responsive.quality must be an object (got ${describe(value.quality)}).`);
    }
    checkKeys(value.quality, QUALITY_KEYS, 'images.responsive.quality');
    for (const [format, quality] of Object.entries(value.quality)) {
      if (quality !== undefined && !isIntegerInRange(quality, 1, 100)) {
        fail(
          `images.responsive.quality.${format} must be a whole number between 1 and 100 (got ${describe(quality)}).`,
        );
      }
    }
  }

  if (value.sizes !== undefined && (typeof value.sizes !== 'string' || !value.sizes.trim())) {
    fail(`images.responsive.sizes must be a non-empty string (got ${describe(value.sizes)}).`);
  }
}

function validateFont(font: unknown, index: number): void {
  const path = `images.og.fonts[${index}]`;
  if (!isPlainObject(font)) {
    fail(`${path} must be an object with name and path (got ${describe(font)}).`);
  }
  checkKeys(font, FONT_KEYS, path);
  if (typeof font.name !== 'string' || !font.name.trim()) {
    fail(`${path}.name must be a non-empty string.`);
  }
  if (typeof font.path !== 'string' || !font.path.trim()) {
    fail(`${path}.path must be a non-empty string.`);
  }
  if (font.weight !== undefined && !isIntegerInRange(font.weight, 100, 900)) {
    fail(
      `${path}.weight must be a whole number between 100 and 900 (got ${describe(font.weight)}).`,
    );
  }
  if (font.style !== undefined && font.style !== 'normal' && font.style !== 'italic') {
    fail(`${path}.style must be 'normal' or 'italic' (got ${describe(font.style)}).`);
  }
}

function validateOg(value: unknown): void {
  if (typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    fail(`images.og must be true, false or an object (got ${describe(value)}).`);
  }
  checkKeys(value, OG_KEYS, 'images.og');

  if (value.template !== undefined) {
    if (
      typeof value.template !== 'string' ||
      !value.template.endsWith('.eta') ||
      /[/\\]/.test(value.template)
    ) {
      fail(
        `images.og.template must be a file name ending in .eta, such as 'og.eta' (got ${describe(value.template)}).`,
      );
    }
  }

  for (const dimension of ['width', 'height'] as const) {
    if (value[dimension] !== undefined && !isIntegerInRange(value[dimension], 1, MAX_OG_SIZE)) {
      fail(
        `images.og.${dimension} must be a whole number of pixels between 1 and ${MAX_OG_SIZE} (got ${describe(value[dimension])}).`,
      );
    }
  }

  if (value.format !== undefined && value.format !== 'png' && value.format !== 'jpeg') {
    fail(`images.og.format must be 'png' or 'jpeg' (got ${describe(value.format)}).`);
  }

  if (value.fonts !== undefined) {
    if (!Array.isArray(value.fonts)) {
      fail(`images.og.fonts must be an array (got ${describe(value.fonts)}).`);
    }
    value.fonts.forEach(validateFont);
  }

  if (value.exclude !== undefined) {
    if (!Array.isArray(value.exclude) || !value.exclude.every((p) => typeof p === 'string')) {
      fail(
        `images.og.exclude must be an array of URL glob patterns (got ${describe(value.exclude)}).`,
      );
    }
  }
}

/**
 * Validates the `images` configuration block.
 *
 * @param images - The `images` value from the config
 * @throws {ConfigValidationError} When an option has the wrong type or value
 */
export function validateImagesConfig(images: unknown): void {
  if (images === undefined || images === false) {
    return;
  }
  if (!isPlainObject(images)) {
    fail(`images must be an object or false (got ${describe(images)}).`);
  }
  checkKeys(images, IMAGES_KEYS, 'images');

  if (images.eagerFirst !== undefined && typeof images.eagerFirst !== 'boolean') {
    fail(`images.eagerFirst must be true or false (got ${describe(images.eagerFirst)}).`);
  }
  if (images.dev !== undefined && images.dev !== 'fast' && images.dev !== 'full') {
    fail(`images.dev must be 'fast' or 'full' (got ${describe(images.dev)}).`);
  }
  if (images.responsive !== undefined) {
    validateResponsive(images.responsive);
  }
  if (images.og !== undefined) {
    validateOg(images.og);
  }
}

/**
 * Applies defaults to the `images` configuration block.
 * Expects a block that passed {@link validateImagesConfig}.
 *
 * @param images - The `images` value from the config
 * @returns The resolved options, or `null` when images are turned off with `images: false`
 */
export function resolveImagesConfig(images: StatiConfig['images']): ResolvedImagesConfig | null {
  if (images === false) {
    return null;
  }
  const config = images ?? {};

  let responsive: ResolvedResponsiveConfig | null = null;
  if (config.responsive) {
    const options = config.responsive === true ? {} : config.responsive;
    const quality = options.quality ?? {};
    responsive = {
      widths: [...new Set(options.widths ?? DEFAULT_IMAGE_WIDTHS)].sort((a, b) => a - b),
      formats: [...new Set(options.formats ?? DEFAULT_IMAGE_FORMATS)],
      quality: {
        avif: quality.avif ?? DEFAULT_IMAGE_QUALITY.avif,
        webp: quality.webp ?? DEFAULT_IMAGE_QUALITY.webp,
        jpeg: quality.jpeg ?? DEFAULT_IMAGE_QUALITY.jpeg,
        ...(quality.png !== undefined && { png: quality.png }),
      },
      sizes: options.sizes ?? DEFAULT_IMAGE_SIZES,
    };
  }

  let og: ResolvedOgConfig | null = null;
  if (config.og) {
    const options = config.og === true ? {} : config.og;
    og = {
      template: options.template ?? DEFAULT_OG_TEMPLATE,
      width: options.width ?? DEFAULT_OG_WIDTH,
      height: options.height ?? DEFAULT_OG_HEIGHT,
      format: options.format ?? 'png',
      fonts: options.fonts ?? [],
      exclude: options.exclude ?? [],
    };
  }

  return {
    eagerFirst: config.eagerFirst ?? true,
    responsive,
    og,
    dev: config.dev ?? 'fast',
  };
}
