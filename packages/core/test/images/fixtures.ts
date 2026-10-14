/**
 * Minimal image files for tests. Headers are well formed; pixel data is not, which is enough
 * for header probing and file copying.
 */

function u16be(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function u32be(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

function u16le(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u24le(value: number): Buffer {
  const buffer = Buffer.alloc(3);
  buffer.writeUIntLE(value, 0, 3);
  return buffer;
}

function pngChunk(type: string, data: Buffer): Buffer {
  return Buffer.concat([u32be(data.length), Buffer.from(type, 'latin1'), data, u32be(0)]);
}

/** A PNG with the given size; `frames` > 1 adds an APNG acTL chunk. */
export function pngBytes(width: number, height: number, frames = 1): Buffer {
  const ihdr = Buffer.concat([u32be(width), u32be(height), Buffer.from([8, 6, 0, 0, 0])]);
  const chunks = [pngChunk('IHDR', ihdr)];
  if (frames > 1) {
    chunks.push(pngChunk('acTL', Buffer.concat([u32be(frames), u32be(0)])));
  }
  chunks.push(pngChunk('IDAT', Buffer.from([0, 0, 0, 0])), pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...chunks]);
}

function exifSegment(orientation: number, littleEndian: boolean): Buffer {
  const u16 = (v: number) => {
    const b = Buffer.alloc(2);
    if (littleEndian) b.writeUInt16LE(v);
    else b.writeUInt16BE(v);
    return b;
  };
  const u32 = (v: number) => {
    const b = Buffer.alloc(4);
    if (littleEndian) b.writeUInt32LE(v);
    else b.writeUInt32BE(v);
    return b;
  };
  const tiff = Buffer.concat([
    Buffer.from(littleEndian ? 'II' : 'MM', 'latin1'),
    u16(42),
    u32(8),
    u16(1), // one IFD entry
    u16(0x0112), // orientation
    u16(3), // SHORT
    u32(1),
    u16(orientation),
    u16(0),
    u32(0), // no next IFD
  ]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  return Buffer.concat([Buffer.from([0xff, 0xe1]), u16be(payload.length + 2), payload]);
}

/** A baseline JPEG with the given stored size and optional EXIF orientation. */
export function jpegBytes(
  width: number,
  height: number,
  options: { orientation?: number; littleEndian?: boolean; marker?: number } = {},
): Buffer {
  const parts: Buffer[] = [Buffer.from([0xff, 0xd8])];
  // A JFIF segment before EXIF, as cameras and editors write it
  const jfif = Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1');
  parts.push(Buffer.from([0xff, 0xe0]), u16be(jfif.length + 2), jfif);
  if (options.orientation !== undefined) {
    parts.push(exifSegment(options.orientation, options.littleEndian ?? false));
  }
  const sof = Buffer.concat([
    Buffer.from([8]),
    u16be(height),
    u16be(width),
    Buffer.from([3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]),
  ]);
  parts.push(Buffer.from([0xff, options.marker ?? 0xc0]), u16be(sof.length + 2), sof);
  parts.push(Buffer.from([0xff, 0xda, 0, 2, 0xff, 0xd9]));
  return Buffer.concat(parts);
}

function gifImage(): Buffer {
  // Image descriptor, LZW minimum code size, one data sub-block, block terminator
  return Buffer.concat([
    Buffer.from([0x2c]),
    Buffer.alloc(8),
    Buffer.from([0]),
    Buffer.from([2, 2, 0x4c, 0x01, 0]),
  ]);
}

/** A GIF with the given size and number of frames. */
export function gifBytes(width: number, height: number, frames = 1): Buffer {
  const header = Buffer.concat([
    Buffer.from('GIF89a', 'latin1'),
    u16le(width),
    u16le(height),
    Buffer.from([0x80, 0, 0]), // 2-entry global color table
    Buffer.alloc(6),
  ]);
  // A graphic control extension before each frame, as animated GIFs have
  const gce = Buffer.from([0x21, 0xf9, 4, 0, 10, 0, 0, 0]);
  const body = Array.from({ length: frames }, () => Buffer.concat([gce, gifImage()]));
  return Buffer.concat([header, ...body, Buffer.from([0x3b])]);
}

function riff(chunk: string, data: Buffer): Buffer {
  const body = Buffer.concat([
    Buffer.from('WEBP', 'latin1'),
    Buffer.from(chunk, 'latin1'),
    u32le(data.length),
    data,
  ]);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), u32le(body.length), body]);
}

function u32le(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

/** A lossy (VP8) WebP. */
export function webpLossyBytes(width: number, height: number): Buffer {
  return riff(
    'VP8 ',
    Buffer.concat([
      Buffer.from([0x30, 0x01, 0x00]), // frame tag
      Buffer.from([0x9d, 0x01, 0x2a]), // start code
      u16le(width),
      u16le(height),
      Buffer.alloc(4),
    ]),
  );
}

/** A lossless (VP8L) WebP. */
export function webpLosslessBytes(width: number, height: number): Buffer {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  return riff('VP8L', Buffer.concat([Buffer.from([0x2f]), u32le(bits), Buffer.alloc(4)]));
}

/** An extended (VP8X) WebP, optionally flagged as animated. */
export function webpExtendedBytes(width: number, height: number, animated = false): Buffer {
  return riff(
    'VP8X',
    Buffer.concat([
      Buffer.from([animated ? 0x02 : 0x00, 0, 0, 0]),
      u24le(width - 1),
      u24le(height - 1),
      Buffer.alloc(4),
    ]),
  );
}

function box(type: string, ...payload: Buffer[]): Buffer {
  const body = Buffer.concat(payload);
  return Buffer.concat([u32be(body.length + 8), Buffer.from(type, 'latin1'), body]);
}

/** An AVIF with an ispe property and optional irot rotation; `avis` marks a sequence. */
export function avifBytes(
  width: number,
  height: number,
  options: { rotation?: number; animated?: boolean } = {},
): Buffer {
  const brand = options.animated ? 'avis' : 'avif';
  const ftyp = box(
    'ftyp',
    Buffer.from(brand, 'latin1'),
    u32be(0),
    Buffer.from(`mif1${brand}`, 'latin1'),
  );
  const properties = [
    // A small thumbnail-sized ispe first; the probe must pick the largest
    box('ispe', u32be(0), u32be(64), u32be(32)),
    box('ispe', u32be(0), u32be(width), u32be(height)),
  ];
  if (options.rotation !== undefined) {
    properties.push(box('irot', Buffer.from([options.rotation])));
  }
  const meta = box(
    'meta',
    u32be(0),
    box('hdlr', Buffer.alloc(24)),
    box('iprp', box('ipco', ...properties)),
  );
  return Buffer.concat([ftyp, meta, box('mdat', Buffer.alloc(8))]);
}
