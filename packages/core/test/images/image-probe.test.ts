import { describe, expect, it } from 'vitest';
import { probeImage } from '../../src/images/utils/index.js';
import {
  avifBytes,
  exifSegment,
  gifBytes,
  jpegBytes,
  pngBytes,
  webpExtendedBytes,
  webpLosslessBytes,
  webpLossyBytes,
} from './fixtures.js';

/** A JPEG marker segment. */
function segment(marker: number, payload: Buffer): Buffer {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), length, payload]);
}

describe('probeImage', () => {
  it('reads PNG dimensions', () => {
    expect(probeImage(pngBytes(640, 480))).toEqual({
      format: 'png',
      width: 640,
      height: 480,
      animated: false,
    });
  });

  it('detects animated PNG from its acTL chunk', () => {
    expect(probeImage(pngBytes(100, 50, 3))).toMatchObject({ format: 'png', animated: true });
    expect(probeImage(pngBytes(100, 50, 1))).toMatchObject({ animated: false });
  });

  it('reads JPEG dimensions from the start-of-frame segment', () => {
    expect(probeImage(jpegBytes(1600, 900))).toEqual({
      format: 'jpeg',
      width: 1600,
      height: 900,
      animated: false,
    });
  });

  it('reads progressive JPEG dimensions', () => {
    expect(probeImage(jpegBytes(800, 600, { marker: 0xc2 }))).toMatchObject({
      width: 800,
      height: 600,
    });
  });

  it.each([5, 6, 7, 8])('swaps width and height for EXIF orientation %i', (orientation) => {
    expect(probeImage(jpegBytes(4000, 3000, { orientation }))).toEqual({
      format: 'jpeg',
      width: 3000,
      height: 4000,
      orientation,
      animated: false,
    });
  });

  it.each([1, 2, 3, 4])('keeps width and height for EXIF orientation %i', (orientation) => {
    expect(probeImage(jpegBytes(4000, 3000, { orientation }))).toMatchObject({
      width: 4000,
      height: 3000,
      orientation,
    });
  });

  it('skips JPEG fill bytes and markers without a length', () => {
    const jpeg = jpegBytes(640, 480);
    // A 0xFF fill byte, then a restart marker, after the start of image
    const padded = Buffer.concat([
      jpeg.subarray(0, 2),
      Buffer.from([0xff, 0xff, 0xd0]),
      jpeg.subarray(2),
    ]);
    expect(probeImage(padded)).toMatchObject({ format: 'jpeg', width: 640, height: 480 });
  });

  it('reads the orientation from the EXIF segment, not from other APP1 data such as XMP', () => {
    const jpeg = jpegBytes(4000, 3000, { orientation: 6 });
    // Inserted after the start of image and the JFIF segment, before EXIF
    const withXmp = Buffer.concat([
      jpeg.subarray(0, 20),
      segment(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>', 'latin1')),
      jpeg.subarray(20),
    ]);
    expect(probeImage(withXmp)).toMatchObject({ width: 3000, height: 4000, orientation: 6 });
  });

  it('ignores EXIF without an orientation tag', () => {
    const jpeg = jpegBytes(4000, 3000);
    // The camera make (0x010F) where the orientation would be
    const withExif = Buffer.concat([
      jpeg.subarray(0, 20),
      exifSegment(6, false, 0x010f),
      jpeg.subarray(20),
    ]);
    expect(probeImage(withExif)).toEqual({
      format: 'jpeg',
      width: 4000,
      height: 3000,
      animated: false,
    });
  });

  it('reads little-endian EXIF', () => {
    expect(probeImage(jpegBytes(400, 300, { orientation: 6, littleEndian: true }))).toMatchObject({
      width: 300,
      height: 400,
    });
  });

  it('reads GIF dimensions and detects animation by frame count', () => {
    expect(probeImage(gifBytes(320, 200))).toEqual({
      format: 'gif',
      width: 320,
      height: 200,
      animated: false,
    });
    expect(probeImage(gifBytes(320, 200, 2))).toMatchObject({ animated: true });
  });

  it('reads a GIF whose frame data is cut short', () => {
    expect(probeImage(gifBytes(320, 200).subarray(0, 40))).toEqual({
      format: 'gif',
      width: 320,
      height: 200,
      animated: false,
    });
  });

  it('reads lossy, lossless and extended WebP', () => {
    expect(probeImage(webpLossyBytes(1024, 768))).toEqual({
      format: 'webp',
      width: 1024,
      height: 768,
      animated: false,
    });
    expect(probeImage(webpLosslessBytes(300, 150))).toMatchObject({ width: 300, height: 150 });
    expect(probeImage(webpExtendedBytes(5000, 2000))).toMatchObject({
      width: 5000,
      height: 2000,
      animated: false,
    });
    expect(probeImage(webpExtendedBytes(500, 200, true))).toMatchObject({ animated: true });
  });

  it('reads AVIF dimensions from the largest ispe property', () => {
    expect(probeImage(avifBytes(1920, 1080))).toEqual({
      format: 'avif',
      width: 1920,
      height: 1080,
      animated: false,
    });
  });

  it('applies AVIF irot rotation and detects image sequences', () => {
    expect(probeImage(avifBytes(1920, 1080, { rotation: 1 }))).toMatchObject({
      width: 1080,
      height: 1920,
    });
    expect(probeImage(avifBytes(1920, 1080, { rotation: 2 }))).toMatchObject({ width: 1920 });
    expect(probeImage(avifBytes(64, 64, { animated: true }))).toMatchObject({ animated: true });
  });

  it('reads AVIF boxes with 64-bit sizes and boxes that run to the end of the file', () => {
    expect(probeImage(avifBytes(1920, 1080, { extendedSizes: true }))).toEqual({
      format: 'avif',
      width: 1920,
      height: 1080,
      animated: false,
    });
  });

  it('returns null for truncated files', () => {
    expect(probeImage(pngBytes(10, 10).subarray(0, 20))).toBeNull();
    // Cut inside the start-of-frame height field
    expect(probeImage(jpegBytes(10, 10).subarray(0, 26))).toBeNull();
    // Ends after the JFIF segment, before any start-of-frame marker
    expect(probeImage(jpegBytes(10, 10).subarray(0, 20))).toBeNull();
    expect(probeImage(webpLossyBytes(10, 10).subarray(0, 25))).toBeNull();
    expect(probeImage(avifBytes(10, 10).subarray(0, 40))).toBeNull();
  });

  it('returns null for unknown formats and corrupt headers', () => {
    expect(probeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(probeImage(Buffer.alloc(0))).toBeNull();
    expect(probeImage(pngBytes(0, 10))).toBeNull();
    // A WebP whose first chunk is none of VP8, VP8L and VP8X
    const webp = webpLossyBytes(10, 10);
    webp.write('ALPH', 12, 'latin1');
    expect(probeImage(webp)).toBeNull();
    // JPEG that starts scanning before declaring its size
    expect(probeImage(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0, 2, 0xff, 0xd9]))).toBeNull();
  });
});
