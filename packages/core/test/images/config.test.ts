import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveImagesConfig, validateImagesConfig } from '../../src/images/config.js';
import { ConfigValidationError } from '../../src/config/errors.js';
import { clearConfigCache, loadConfig } from '../../src/config/loader.js';

describe('validateImagesConfig', () => {
  it('accepts no config, false and the documented options', () => {
    expect(() => validateImagesConfig(undefined)).not.toThrow();
    expect(() => validateImagesConfig(false)).not.toThrow();
    expect(() =>
      validateImagesConfig({
        eagerFirst: false,
        responsive: {
          widths: [320, 640],
          formats: ['webp'],
          quality: { webp: 70, png: 90 },
          sizes: '50vw',
        },
        og: {
          template: 'card.eta',
          width: 1200,
          height: 600,
          format: 'jpeg',
          fonts: [{ name: 'Inter', path: './fonts/inter.woff', weight: 700, style: 'normal' }],
          exclude: ['/404'],
        },
        dev: 'full',
      }),
    ).not.toThrow();
    expect(() => validateImagesConfig({ responsive: true, og: true })).not.toThrow();
  });

  it.each([
    [true, 'images must be an object or false'],
    [{ responsive: 'yes' }, 'images.responsive must be true, false or an object'],
    [{ responsive: { widths: [] } }, 'images.responsive.widths must be a non-empty array'],
    [{ responsive: { widths: [0] } }, 'images.responsive.widths must be a non-empty array'],
    [{ responsive: { widths: [1.5] } }, 'images.responsive.widths must be a non-empty array'],
    [
      { responsive: { formats: ['jpeg'] } },
      "images.responsive.formats must be an array of 'avif' and 'webp'",
    ],
    [
      { responsive: { quality: { avif: 0 } } },
      'images.responsive.quality.avif must be a whole number',
    ],
    [{ responsive: { quality: 80 } }, 'images.responsive.quality must be an object (got 80)'],
    [{ responsive: { quality: { gif: 50 } } }, 'Unknown option images.responsive.quality.gif'],
    [{ responsive: { width: [100] } }, 'Unknown option images.responsive.width'],
    [{ responsive: { sizes: '' } }, 'images.responsive.sizes must be a non-empty string'],
    [{ og: { template: 'og.html' } }, 'images.og.template must be a file name ending in .eta'],
    [
      { og: { template: 'social/og.eta' } },
      'images.og.template must be a file name ending in .eta',
    ],
    [{ og: { width: 0 } }, 'images.og.width must be a whole number of pixels'],
    [{ og: { format: 'webp' } }, "images.og.format must be 'png' or 'jpeg'"],
    [{ og: 'yes' }, 'images.og must be true, false or an object (got "yes")'],
    [{ og: { fonts: {} } }, 'images.og.fonts must be an array'],
    [{ og: { fonts: ['inter.woff'] } }, 'images.og.fonts[0] must be an object with name and path'],
    [
      { og: { fonts: [{ name: ' ', path: 'a.ttf' }] } },
      'images.og.fonts[0].name must be a non-empty',
    ],
    [{ og: { fonts: [{ name: 'Inter' }] } }, 'images.og.fonts[0].path must be a non-empty string'],
    [
      { og: { fonts: [{ name: 'Inter', path: 'a.ttf', style: 'oblique' }] } },
      "images.og.fonts[0].style must be 'normal' or 'italic'",
    ],
    [
      { og: { fonts: [{ name: 'Inter', path: 'a.ttf', weight: 950 }] } },
      'images.og.fonts[0].weight',
    ],
    [{ og: { exclude: '/404' } }, 'images.og.exclude must be an array'],
    [{ dev: 'slow' }, "images.dev must be 'fast' or 'full'"],
    [{ eagerFirst: 'yes' }, 'images.eagerFirst must be true or false'],
    [{ formats: ['avif'] }, 'Unknown option images.formats'],
  ])('rejects %j', (images, message) => {
    expect(() => validateImagesConfig(images)).toThrow(ConfigValidationError);
    expect(() => validateImagesConfig(images)).toThrow(message);
  });

  it('shows values that JSON cannot represent in messages', () => {
    expect(() => validateImagesConfig({ dev: 10n })).toThrow(
      "images.dev must be 'fast' or 'full' (got 10)",
    );
  });
});

describe('resolveImagesConfig', () => {
  it('returns null when images are turned off', () => {
    expect(resolveImagesConfig(false)).toBeNull();
  });

  it('turns on only the built-in behavior by default', () => {
    expect(resolveImagesConfig(undefined)).toEqual({
      eagerFirst: true,
      responsive: null,
      og: null,
      dev: 'fast',
    });
  });

  it('expands true to defaults', () => {
    expect(resolveImagesConfig({ responsive: true, og: true })).toEqual({
      eagerFirst: true,
      responsive: {
        widths: [480, 960, 1440],
        formats: ['avif', 'webp'],
        quality: { avif: 50, webp: 75, jpeg: 80 },
        sizes: '100vw',
      },
      og: {
        template: 'og.eta',
        width: 1200,
        height: 630,
        format: 'png',
        fonts: [],
        exclude: [],
      },
      dev: 'fast',
    });
  });

  it('sorts and deduplicates widths and keeps PNG lossless unless set', () => {
    const resolved = resolveImagesConfig({
      responsive: { widths: [960, 480, 960], quality: { avif: 40 } },
    });
    expect(resolved?.responsive).toMatchObject({
      widths: [480, 960],
      quality: { avif: 40, webp: 75, jpeg: 80 },
    });
    expect(resolved?.responsive?.quality).not.toHaveProperty('png');
    expect(
      resolveImagesConfig({ responsive: { quality: { png: 90 } } })?.responsive?.quality,
    ).toMatchObject({
      png: 90,
    });
  });
});

describe('loadConfig with an invalid images block', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'stati-images-config-'));
    clearConfigCache();
  });

  afterEach(async () => {
    clearConfigCache();
    await rm(projectDir, { recursive: true, force: true });
  });

  it('throws instead of falling back to the default config', async () => {
    await writeFile(
      join(projectDir, 'stati.config.mjs'),
      "export default { site: { title: 'T', baseUrl: 'https://example.com' }, images: { responsive: { widths: [] } } };",
    );
    await expect(loadConfig(projectDir)).rejects.toBeInstanceOf(ConfigValidationError);
    await expect(loadConfig(projectDir)).rejects.toThrow('Invalid images configuration');
  });
});
