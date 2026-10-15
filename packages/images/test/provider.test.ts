import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { Eta } from 'eta';
import { createImageProvider } from '../src/index.js';
import { createLimiter, defaultConcurrency } from '../src/runtime.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'stati-images-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function sourceImage(
  name: string,
  width: number,
  height: number,
  options: { orientation?: number; alpha?: boolean } = {},
): Promise<string> {
  const path = join(dir, name);
  let image = sharp({
    create: {
      width,
      height,
      channels: options.alpha ? 4 : 3,
      background: options.alpha ? { r: 37, g: 99, b: 235, alpha: 0.5 } : { r: 37, g: 99, b: 235 },
    },
  });
  if (options.orientation) {
    image = image.withMetadata({ orientation: options.orientation });
  }
  await (name.endsWith('.png') ? image.png() : image.jpeg()).toFile(path);
  return path;
}

describe('createImageProvider', () => {
  it('implements version 1 of the provider contract', async () => {
    const provider = await createImageProvider();
    expect(provider.apiVersion).toBe(1);
    expect(provider.version).toMatch(/^@stati\/images@\S+ sharp@\d+\.\d+\.\d+/);
    expect(typeof provider.renderOgImage).toBe('function');

    const defaults = await provider.loadOgDefaults!();
    expect(defaults.template).toContain('stati.page.title');
    expect(defaults.fonts.map((font) => `${font.name} ${font.weight}`)).toEqual([
      'Archivo 800',
      'Inter 400',
      'Inter 500',
      'Fira Code 400',
    ]);
    for (const font of defaults.fonts) {
      expect(font.data.subarray(0, 4).toString('latin1')).toBe('wOFF');
    }
  });
});

describe('createVariants', () => {
  it('writes each output at its width and format', async () => {
    const provider = await createImageProvider();
    const sourcePath = await sourceImage('photo.jpg', 1600, 900);
    const outputs = [
      { filePath: join(dir, 'a-480.avif'), width: 480, format: 'avif' as const, quality: 50 },
      { filePath: join(dir, 'a-960.webp'), width: 960, format: 'webp' as const, quality: 75 },
      { filePath: join(dir, 'a-1440.jpg'), width: 1440, format: 'jpeg' as const, quality: 80 },
    ];
    await provider.createVariants({ sourcePath, outputs });

    for (const output of outputs) {
      const meta = await sharp(output.filePath).metadata();
      expect(meta.width).toBe(output.width);
      expect(meta.height).toBe(Math.round((output.width * 900) / 1600));
      expect(meta.format).toBe(output.format === 'avif' ? 'heif' : output.format);
    }
    // Temporary files are renamed into place
    expect((await readdir(dir)).filter((file) => file.endsWith('.tmp'))).toEqual([]);
  });

  it('applies EXIF orientation before resizing', async () => {
    const provider = await createImageProvider();
    // Stored landscape, displayed portrait
    const sourcePath = await sourceImage('portrait.jpg', 400, 200, { orientation: 6 });
    const filePath = join(dir, 'portrait-100.webp');
    await provider.createVariants({
      sourcePath,
      outputs: [{ filePath, width: 100, format: 'webp', quality: 75 }],
    });

    expect(await sharp(filePath).metadata()).toMatchObject({ width: 100, height: 200 });
  });

  it('never enlarges and keeps PNG fallbacks lossless with transparency', async () => {
    const provider = await createImageProvider();
    const sourcePath = await sourceImage('logo.png', 300, 150, { alpha: true });
    const filePath = join(dir, 'logo-960.png');
    await provider.createVariants({
      sourcePath,
      outputs: [{ filePath, width: 960, format: 'png' }],
    });

    expect(await sharp(filePath).metadata()).toMatchObject({
      width: 300,
      height: 150,
      hasAlpha: true,
      isPalette: false,
    });
  });

  it('quantizes PNG fallbacks to a palette when a PNG quality is set', async () => {
    const provider = await createImageProvider();
    const sourcePath = await sourceImage('logo.png', 300, 150, { alpha: true });
    const filePath = join(dir, 'logo-300.png');
    await provider.createVariants({
      sourcePath,
      outputs: [{ filePath, width: 300, format: 'png', quality: 80 }],
    });

    expect(await sharp(filePath).metadata()).toMatchObject({
      format: 'png',
      width: 300,
      isPalette: true,
    });
  });

  it('fails for files that are not images', async () => {
    const provider = await createImageProvider();
    const sourcePath = join(dir, 'broken.jpg');
    await (await import('node:fs/promises')).writeFile(sourcePath, 'not an image');
    await expect(
      provider.createVariants({
        sourcePath,
        outputs: [
          { filePath: join(dir, 'broken-100.webp'), width: 100, format: 'webp', quality: 75 },
        ],
      }),
    ).rejects.toThrow();
    expect(await readdir(dir)).toEqual(['broken.jpg']);
  });
});

describe('renderOgImage', () => {
  const context = {
    site: { title: 'Stati', baseUrl: 'https://stati.build' },
    page: { url: '/blog/hello/', title: 'Hello & “welcome”', description: 'A first post.' },
    nav: { getParent: () => ({ title: 'Blog' }) },
    og: { width: 1200, height: 630 },
  };

  it('renders the built-in card at the requested size', async () => {
    const provider = await createImageProvider();
    const defaults = await provider.loadOgDefaults!();
    const html = await new Eta({ varName: 'stati' }).renderStringAsync(defaults.template, context);
    expect(html).toContain('Hello &amp; “welcome”');

    const filePath = join(dir, 'card.png');
    await provider.renderOgImage!({
      html,
      width: 1200,
      height: 630,
      format: 'png',
      fonts: defaults.fonts,
      filePath,
      templatePath: 'built-in Open Graph template',
    });
    expect(await sharp(filePath).metadata()).toMatchObject({
      width: 1200,
      height: 630,
      format: 'png',
    });
  });

  it('writes JPEG when asked', async () => {
    const provider = await createImageProvider();
    const defaults = await provider.loadOgDefaults!();
    const filePath = join(dir, 'card.jpg');
    await provider.renderOgImage!({
      html: '<div style="display:flex;width:100%;height:100%;background-color:#fff">Hi</div>',
      width: 600,
      height: 315,
      format: 'jpeg',
      fonts: defaults.fonts,
      filePath,
      templatePath: 'site/og.eta',
    });
    expect(await sharp(filePath).metadata()).toMatchObject({
      width: 600,
      height: 315,
      format: 'jpeg',
    });
  });

  it('names the template when Satori rejects its CSS', async () => {
    const provider = await createImageProvider();
    const defaults = await provider.loadOgDefaults!();
    await expect(
      provider.renderOgImage!({
        html: '<div style="display:grid">x</div>',
        width: 1200,
        height: 630,
        format: 'png',
        fonts: defaults.fonts,
        filePath: join(dir, 'grid.png'),
        templatePath: 'site/blog/og.eta',
      }),
    ).rejects.toThrow(/^site\/blog\/og\.eta could not be rendered: .*display/);
  });
});

describe('concurrency', () => {
  it('defaults to at most three encodes, leaving a libuv thread for file I/O', () => {
    expect(defaultConcurrency()).toBeGreaterThanOrEqual(1);
    expect(defaultConcurrency()).toBeLessThanOrEqual(3);
  });

  it('never runs more tasks at once than the limit', async () => {
    const limit = createLimiter(2);
    let running = 0;
    let peak = 0;
    const task = () =>
      limit(async () => {
        running++;
        peak = Math.max(peak, running);
        await delay(5);
        running--;
      });
    await Promise.all(Array.from({ length: 8 }, task));
    expect(peak).toBe(2);
  });
});
