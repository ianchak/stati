/**
 * Renders Open Graph images: template HTML to SVG with Satori, then to PNG or JPEG with sharp.
 * @module og/render
 */

import type { OgImageRequest } from '@stati/core/types';
import { htmlToSatori } from './html.js';
import { writeAtomically, type SharpModule } from '../runtime.js';

interface SatoriFont {
  name: string;
  data: Buffer;
  weight?: number;
  style?: 'normal' | 'italic';
}

type Satori = (
  element: unknown,
  options: { width: number; height: number; fonts: SatoriFont[] },
) => Promise<string>;

let satoriModule: Promise<Satori> | undefined;

/** Imports Satori on first use, so builds that only resize images never load it. */
function loadSatori(): Promise<Satori> {
  satoriModule ??= import('satori').then((module) => module.default as unknown as Satori);
  return satoriModule;
}

/**
 * Rasterizes one Open Graph image.
 *
 * @param sharp - The sharp module
 * @param request - Template HTML, size, format, fonts and output path from core
 * @throws {Error} Naming the template when Satori cannot lay it out
 */
export async function renderOgImage(sharp: SharpModule, request: OgImageRequest): Promise<void> {
  const satori = await loadSatori();

  let svg: string;
  try {
    svg = await satori(htmlToSatori(request.html), {
      width: request.width,
      height: request.height,
      fonts: request.fonts.map((font) => ({
        name: font.name,
        data: font.data,
        ...(font.weight !== undefined && { weight: font.weight }),
        ...(font.style !== undefined && { style: font.style }),
      })),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${request.templatePath} could not be rendered: ${reason}`, { cause: error });
  }

  const image = sharp(Buffer.from(svg));
  const pipeline =
    request.format === 'jpeg'
      ? image.flatten({ background: '#ffffff' }).jpeg({ quality: 90, mozjpeg: true })
      : image.png({ compressionLevel: 9 });
  await writeAtomically(request.filePath, (tempPath) => pipeline.toFile(tempPath));
}
