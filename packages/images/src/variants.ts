/**
 * Encodes responsive image variants with sharp.
 * @module variants
 */

import type { VariantOutput, VariantRequest } from '@stati/core/types';
import { writeAtomically, type SharpModule } from './runtime.js';

/** Quality used when core does not pass one (it always does for lossy formats). */
const FALLBACK_QUALITY = { avif: 50, webp: 75, jpeg: 80 } as const;

/**
 * Encodes one output: auto-rotated by EXIF orientation, resized to its width without
 * enlarging, in its format. sharp reads the source file itself, so outputs waiting for the
 * limiter hold no image data.
 */
async function encodeOutput(
  sharp: SharpModule,
  sourcePath: string,
  output: VariantOutput,
): Promise<void> {
  let pipeline = sharp(sourcePath, { failOn: 'error' })
    .rotate()
    .resize({ width: output.width, withoutEnlargement: true });

  switch (output.format) {
    case 'avif':
      pipeline = pipeline.avif({ quality: output.quality ?? FALLBACK_QUALITY.avif });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: output.quality ?? FALLBACK_QUALITY.webp });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: output.quality ?? FALLBACK_QUALITY.jpeg, mozjpeg: true });
      break;
    case 'png':
      // Lossless unless a quality is given, which switches to palette quantization
      pipeline =
        output.quality === undefined
          ? pipeline.png({ compressionLevel: 9 })
          : pipeline.png({ quality: output.quality, palette: true });
      break;
  }

  await writeAtomically(output.filePath, (tempPath) => pipeline.toFile(tempPath));
}

/**
 * Encodes every requested output of one source image. When an output fails, it still waits
 * for the others, so nothing is written after core has been told the image failed.
 *
 * @param sharp - The sharp module
 * @param request - Source path and outputs chosen by core
 * @param limit - Concurrency limiter; each output is one task
 * @throws The first output's error, once every output has finished
 */
export async function createVariants(
  sharp: SharpModule,
  request: VariantRequest,
  limit: <T>(task: () => Promise<T>) => Promise<T>,
): Promise<void> {
  const results = await Promise.allSettled(
    request.outputs.map((output) => limit(() => encodeOutput(sharp, request.sourcePath, output))),
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failure) {
    throw failure.reason instanceof Error ? failure.reason : new Error(String(failure.reason));
  }
}
