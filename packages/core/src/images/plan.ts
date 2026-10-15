/**
 * Decides which files to generate for an image and what to call them.
 * Names come from inputs, not from encoded bytes, so page HTML can be written before
 * encoding finishes.
 * @module images/plan
 */

import { createHash } from 'node:crypto';
import { basename, extname, posix } from 'node:path';
import { slugify } from '../core/utils/index.js';
import { IMAGES_OUTPUT_DIR } from '../constants.js';
import type { ImageOutputFormat, ImageSourceFormat } from '../types/index.js';
import type { ResolvedResponsiveConfig } from './config.js';

/** Length of the hash in generated file names. */
const NAME_HASH_LENGTH = 8;

/** MIME types for `<source type>`. */
const MIME_TYPES: Record<ImageOutputFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

/**
 * Picks the widths to generate for an image.
 * Configured widths up to the image's own width are kept, and the image's own width is
 * added when it is below the largest configured width. Images are never enlarged.
 *
 * @param intrinsicWidth - The image's display width
 * @param configured - Candidate widths, ascending
 * @returns Widths to generate, ascending
 */
export function planWidths(intrinsicWidth: number, configured: readonly number[]): number[] {
  const widths = configured.filter((width) => width <= intrinsicWidth);
  const largest = configured.length > 0 ? Math.max(...configured) : intrinsicWidth;
  if (intrinsicWidth < largest && !widths.includes(intrinsicWidth)) {
    widths.push(intrinsicWidth);
  }
  if (widths.length === 0) {
    widths.push(intrinsicWidth);
  }
  return [...new Set(widths)].sort((a, b) => a - b);
}

/**
 * The format of the `<img>` fallback for a source format: the source's own format, except
 * GIF, which becomes PNG.
 */
export function fallbackFormatFor(format: ImageSourceFormat): ImageOutputFormat {
  return format === 'gif' ? 'png' : format;
}

/**
 * File extension for a format.
 */
export function extensionFor(format: ImageSourceFormat | ImageOutputFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

/**
 * MIME type for a generated format.
 */
export function mimeTypeFor(format: ImageOutputFormat): string {
  return MIME_TYPES[format];
}

/**
 * A URL-safe base name for generated files, from the source file name.
 */
export function imageBaseName(filePath: string): string {
  return slugify(basename(filePath, extname(filePath))) || 'image';
}

/** One file to generate, with its path relative to the output directory and its URL. */
export interface PlannedOutput {
  /** Path relative to the output directory, with forward slashes */
  relPath: string;
  /** Root-relative URL */
  url: string;
  width: number;
  format: ImageOutputFormat;
  quality?: number;
}

/**
 * A copy of a co-located source image under its content-hashed name.
 */
export interface CopyPlan {
  key: string;
  /** Path relative to the output directory, with forward slashes */
  relPath: string;
  /** Root-relative URL */
  url: string;
}

/**
 * Plans the copy of a co-located image: `/_img/{name}-{hash}.{ext}`.
 *
 * @param filePath - Absolute source path
 * @param sourceHash - SHA-256 of the source bytes
 * @param format - Source format
 */
export function planCopy(
  filePath: string,
  sourceHash: string,
  format: ImageSourceFormat,
): CopyPlan {
  const relPath = posix.join(
    IMAGES_OUTPUT_DIR,
    `${imageBaseName(filePath)}-${sourceHash.slice(0, NAME_HASH_LENGTH)}.${extensionFor(format)}`,
  );
  return { key: `copy:${relPath}`, relPath, url: `/${relPath}` };
}

/**
 * Generated files for one responsive image, grouped for markup.
 */
export interface VariantPlan {
  /** Cache key covering the source bytes, options and encoder */
  key: string;
  /** Every file to generate */
  outputs: PlannedOutput[];
  /** `<source>` elements, one per modern format, in order of preference */
  sources: Array<{ type: string; srcset: string }>;
  /** The `<img>` fallback in the source's own format */
  fallback: { src: string; srcset: string };
}

/**
 * Inputs for {@link planVariants}.
 */
export interface VariantPlanInput {
  filePath: string;
  sourceHash: string;
  format: ImageSourceFormat;
  /** Display width */
  width: number;
  responsive: ResolvedResponsiveConfig;
  /** Encoder identity, so encoder upgrades produce new URLs */
  providerVersion: string;
}

function qualityFor(
  format: ImageOutputFormat,
  responsive: ResolvedResponsiveConfig,
): number | undefined {
  return responsive.quality[format];
}

function srcsetOf(outputs: PlannedOutput[]): string {
  return outputs.map((output) => `${output.url} ${output.width}w`).join(', ');
}

/**
 * Plans the responsive variants of one image: `/_img/{name}-{hash}-{width}.{ext}` for every
 * width in each modern format, plus the fallback format.
 */
export function planVariants(input: VariantPlanInput): VariantPlan {
  const widths = planWidths(input.width, input.responsive.widths);
  const fallbackFormat = fallbackFormatFor(input.format);
  const formats = input.responsive.formats.filter((format) => format !== fallbackFormat);

  const key = createHash('sha256')
    .update(
      JSON.stringify({
        source: input.sourceHash,
        widths,
        formats,
        fallbackFormat,
        quality: [...formats, fallbackFormat].map((f) => qualityFor(f, input.responsive) ?? null),
        provider: input.providerVersion,
      }),
    )
    .digest('hex');
  const name = `${imageBaseName(input.filePath)}-${key.slice(0, NAME_HASH_LENGTH)}`;

  const outputsFor = (format: ImageOutputFormat): PlannedOutput[] =>
    widths.map((width) => {
      const relPath = posix.join(IMAGES_OUTPUT_DIR, `${name}-${width}.${extensionFor(format)}`);
      const quality = qualityFor(format, input.responsive);
      return {
        relPath,
        url: `/${relPath}`,
        width,
        format,
        ...(quality !== undefined && { quality }),
      };
    });

  const sourceOutputs = formats.map((format) => ({ format, outputs: outputsFor(format) }));
  const fallbackOutputs = outputsFor(fallbackFormat);

  return {
    key: `variants:${key}`,
    outputs: [...sourceOutputs.flatMap((group) => group.outputs), ...fallbackOutputs],
    sources: sourceOutputs.map((group) => ({
      type: mimeTypeFor(group.format),
      srcset: srcsetOf(group.outputs),
    })),
    fallback: {
      src: fallbackOutputs[fallbackOutputs.length - 1]!.url,
      srcset: srcsetOf(fallbackOutputs),
    },
  };
}
