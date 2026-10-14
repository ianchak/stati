/**
 * Reads intrinsic dimensions from image file headers without decoding pixels.
 * Covers PNG (and APNG), JPEG (with EXIF orientation), GIF, WebP and AVIF.
 * @module images/utils/image-probe
 */

import type { ImageSourceFormat } from '../../types/index.js';

/**
 * What a header probe found out about an image.
 */
export interface ImageProbeResult {
  /** Detected format */
  format: ImageSourceFormat;
  /** Display width in pixels, with EXIF or `irot` rotation applied */
  width: number;
  /** Display height in pixels, with EXIF or `irot` rotation applied */
  height: number;
  /** JPEG EXIF orientation (1-8), when present */
  orientation?: number;
  /** Whether the file holds more than one frame (animated GIF, APNG, WebP or AVIF) */
  animated: boolean;
}

/**
 * Probes an image buffer for its format, dimensions and animation.
 *
 * @param buffer - The full file contents
 * @returns The probe result, or `null` when the format is unsupported or the header is
 *   truncated or corrupt
 */
export function probeImage(buffer: Buffer): ImageProbeResult | null {
  try {
    if (isPng(buffer)) return probePng(buffer);
    if (isJpeg(buffer)) return probeJpeg(buffer);
    if (isGif(buffer)) return probeGif(buffer);
    if (isWebp(buffer)) return probeWebp(buffer);
    if (isIsoBmff(buffer)) return probeAvif(buffer);
    return null;
  } catch {
    // Reading past the end of a truncated file throws a RangeError
    return null;
  }
}

function hasPositiveSize(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

function ascii(buffer: Buffer, start: number, length: number): string {
  return buffer.toString('latin1', start, start + length);
}

// --- PNG -------------------------------------------------------------------

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 24 && PNG_SIGNATURE.every((byte, i) => buffer[i] === byte);
}

function probePng(buffer: Buffer): ImageProbeResult | null {
  if (ascii(buffer, 12, 4) !== 'IHDR') return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!hasPositiveSize(width, height)) return null;

  // An APNG declares its frames in an acTL chunk before the first IDAT
  let animated = false;
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = ascii(buffer, offset + 4, 4);
    if (type === 'IDAT' || type === 'IEND') break;
    if (type === 'acTL' && offset + 12 <= buffer.length) {
      animated = buffer.readUInt32BE(offset + 8) > 1;
      break;
    }
    offset += 12 + length;
  }

  return { format: 'png', width, height, animated };
}

// --- JPEG ------------------------------------------------------------------

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

/** Start-of-frame markers that carry the image size (excludes DHT, JPG and DAC). */
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function probeJpeg(buffer: Buffer): ImageProbeResult | null {
  let offset = 2;
  let orientation: number | undefined;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1]!;

    // Fill bytes and markers without a length
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    // Start of scan: the size should already have been found
    if (marker === 0xda) return null;

    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    if (marker === 0xe1 && orientation === undefined) {
      orientation = readExifOrientation(buffer, offset + 4, length - 2);
    }

    if (SOF_MARKERS.has(marker)) {
      let height = buffer.readUInt16BE(offset + 5);
      let width = buffer.readUInt16BE(offset + 7);
      if (!hasPositiveSize(width, height)) return null;
      // Orientations 5-8 rotate the image by 90 degrees, swapping its display size
      if (orientation !== undefined && orientation >= 5 && orientation <= 8) {
        [width, height] = [height, width];
      }
      return {
        format: 'jpeg',
        width,
        height,
        animated: false,
        ...(orientation !== undefined && { orientation }),
      };
    }

    offset += 2 + length;
  }

  return null;
}

/**
 * Reads the orientation tag (0x0112) from an APP1 EXIF segment.
 */
function readExifOrientation(buffer: Buffer, start: number, length: number): number | undefined {
  const end = Math.min(start + length, buffer.length);
  if (end - start < 14 || ascii(buffer, start, 6) !== 'Exif\0\0') {
    return undefined;
  }

  const tiff = start + 6;
  const byteOrder = ascii(buffer, tiff, 2);
  if (byteOrder !== 'II' && byteOrder !== 'MM') return undefined;
  const little = byteOrder === 'II';
  const read16 = (pos: number) => (little ? buffer.readUInt16LE(pos) : buffer.readUInt16BE(pos));
  const read32 = (pos: number) => (little ? buffer.readUInt32LE(pos) : buffer.readUInt32BE(pos));

  if (read16(tiff + 2) !== 42) return undefined;
  const ifd = tiff + read32(tiff + 4);
  if (ifd + 2 > end) return undefined;

  const entries = read16(ifd);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return undefined;
    if (read16(entry) === 0x0112) {
      const value = read16(entry + 8);
      return value >= 1 && value <= 8 ? value : undefined;
    }
  }
  return undefined;
}

// --- GIF -------------------------------------------------------------------

function isGif(buffer: Buffer): boolean {
  const signature = ascii(buffer, 0, 6);
  return buffer.length >= 13 && (signature === 'GIF87a' || signature === 'GIF89a');
}

function colorTableSize(flags: number): number {
  return flags & 0x80 ? 3 * 2 ** ((flags & 0x07) + 1) : 0;
}

/** Skips a chain of data sub-blocks and returns the offset after the terminator. */
function skipSubBlocks(buffer: Buffer, offset: number): number {
  while (offset < buffer.length) {
    const size = buffer[offset]!;
    offset += 1;
    if (size === 0) return offset;
    offset += size;
  }
  return offset;
}

function probeGif(buffer: Buffer): ImageProbeResult | null {
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  if (!hasPositiveSize(width, height)) return null;

  // Count image descriptors; a second one means the GIF is animated
  let frames = 0;
  let offset = 13 + colorTableSize(buffer[10]!);
  while (offset < buffer.length && frames < 2) {
    const block = buffer[offset]!;
    if (block === 0x21) {
      offset = skipSubBlocks(buffer, offset + 2);
    } else if (block === 0x2c) {
      frames += 1;
      if (offset + 10 > buffer.length) break;
      offset += 10 + colorTableSize(buffer[offset + 9]!);
      offset = skipSubBlocks(buffer, offset + 1);
    } else {
      break; // Trailer (0x3b) or unexpected data
    }
  }

  return { format: 'gif', width, height, animated: frames > 1 };
}

// --- WebP ------------------------------------------------------------------

function isWebp(buffer: Buffer): boolean {
  // Shorter chunks than each format needs throw while reading, which probeImage turns into null
  return buffer.length >= 16 && ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 4) === 'WEBP';
}

function probeWebp(buffer: Buffer): ImageProbeResult | null {
  const chunk = ascii(buffer, 12, 4);
  let width: number;
  let height: number;
  let animated = false;

  if (chunk === 'VP8 ') {
    // Lossy: a frame tag, then the 9d 01 2a start code and 14-bit dimensions
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    width = buffer.readUInt16LE(26) & 0x3fff;
    height = buffer.readUInt16LE(28) & 0x3fff;
  } else if (chunk === 'VP8L') {
    // Lossless: a 0x2f signature, then width-1 and height-1 as 14-bit fields
    if (buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    width = (bits & 0x3fff) + 1;
    height = ((bits >> 14) & 0x3fff) + 1;
  } else if (chunk === 'VP8X') {
    // Extended: feature flags, then 24-bit canvas width-1 and height-1
    animated = (buffer[20]! & 0x02) !== 0;
    width = buffer.readUIntLE(24, 3) + 1;
    height = buffer.readUIntLE(27, 3) + 1;
  } else {
    return null;
  }

  if (!hasPositiveSize(width, height)) return null;
  return { format: 'webp', width, height, animated };
}

// --- AVIF ------------------------------------------------------------------

interface Box {
  type: string;
  /** Offset of the box payload */
  start: number;
  /** Offset just past the box */
  end: number;
}

function isIsoBmff(buffer: Buffer): boolean {
  return buffer.length >= 16 && ascii(buffer, 4, 4) === 'ftyp';
}

/** Lists the boxes between `start` and `end`. */
function readBoxes(buffer: Buffer, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset);
    const type = ascii(buffer, offset + 4, 4);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      size = Number(buffer.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) break;
    boxes.push({ type, start: offset + header, end: offset + size });
    offset += size;
  }
  return boxes;
}

function probeAvif(buffer: Buffer): ImageProbeResult | null {
  const [ftyp] = readBoxes(buffer, 0, buffer.length);
  if (!ftyp || ftyp.type !== 'ftyp') return null;

  // Major brand, then compatible brands after the minor version
  const brands = [ascii(buffer, ftyp.start, 4)];
  for (let pos = ftyp.start + 8; pos + 4 <= ftyp.end; pos += 4) {
    brands.push(ascii(buffer, pos, 4));
  }
  if (!brands.includes('avif') && !brands.includes('avis')) return null;
  const animated = brands.includes('avis');

  const meta = readBoxes(buffer, ftyp.end, buffer.length).find((box) => box.type === 'meta');
  if (!meta) return null;
  // meta is a full box: skip its version and flags
  const iprp = readBoxes(buffer, meta.start + 4, meta.end).find((box) => box.type === 'iprp');
  if (!iprp) return null;
  const ipco = readBoxes(buffer, iprp.start, iprp.end).find((box) => box.type === 'ipco');
  if (!ipco) return null;

  let width = 0;
  let height = 0;
  let rotated = false;
  for (const property of readBoxes(buffer, ipco.start, ipco.end)) {
    if (property.type === 'ispe' && property.start + 12 <= property.end) {
      // Several ispe boxes can exist (thumbnails, alpha planes); the primary image is the largest
      const w = buffer.readUInt32BE(property.start + 4);
      const h = buffer.readUInt32BE(property.start + 8);
      if (w * h > width * height) {
        width = w;
        height = h;
      }
    } else if (property.type === 'irot' && property.start < property.end) {
      // Rotation in 90-degree steps; odd steps swap the display size
      rotated = (buffer[property.start]! & 0x03) % 2 === 1;
    }
  }

  if (!hasPositiveSize(width, height)) return null;
  if (rotated) [width, height] = [height, width];
  return { format: 'avif', width, height, animated };
}
