import { describe, expect, it } from 'vitest';
import { probeImage } from '../../src/images/utils/index.js';
import {
  avifBytes,
  gifBytes,
  jpegBytes,
  pngBytes,
  webpExtendedBytes,
  webpLosslessBytes,
  webpLossyBytes,
} from './fixtures.js';

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

  it('returns null for truncated files', () => {
    expect(probeImage(pngBytes(10, 10).subarray(0, 20))).toBeNull();
    // Cut inside the start-of-frame height field
    expect(probeImage(jpegBytes(10, 10).subarray(0, 26))).toBeNull();
    expect(probeImage(webpLossyBytes(10, 10).subarray(0, 25))).toBeNull();
    expect(probeImage(avifBytes(10, 10).subarray(0, 40))).toBeNull();
  });

  it('returns null for unknown formats and corrupt headers', () => {
    expect(probeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(probeImage(Buffer.alloc(0))).toBeNull();
    expect(probeImage(pngBytes(0, 10))).toBeNull();
    // JPEG that starts scanning before declaring its size
    expect(probeImage(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0, 2, 0xff, 0xd9]))).toBeNull();
  });
});
