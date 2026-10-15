import { describe, expect, it } from 'vitest';
import {
  fallbackFormatFor,
  imageBaseName,
  planCopy,
  planVariants,
  planWidths,
} from '../../src/images/plan.js';
import type { ResolvedResponsiveConfig } from '../../src/images/config.js';

const responsive: ResolvedResponsiveConfig = {
  widths: [480, 960, 1440],
  formats: ['avif', 'webp'],
  quality: { avif: 50, webp: 75, jpeg: 80 },
  sizes: '100vw',
};

describe('planWidths', () => {
  it('never enlarges and adds the intrinsic width below the largest configured width', () => {
    expect(planWidths(1600, [480, 960, 1440])).toEqual([480, 960, 1440]);
    expect(planWidths(1200, [480, 960, 1440])).toEqual([480, 960, 1200]);
    expect(planWidths(400, [480, 960, 1440])).toEqual([400]);
  });

  it('keeps a configured width equal to the intrinsic width', () => {
    expect(planWidths(1440, [480, 960, 1440])).toEqual([480, 960, 1440]);
    expect(planWidths(960, [480, 960, 1440])).toEqual([480, 960]);
  });

  it('uses the intrinsic width when no widths are configured', () => {
    expect(planWidths(800, [])).toEqual([800]);
  });
});

describe('fallbackFormatFor', () => {
  it('keeps the source format, except GIF which becomes PNG', () => {
    expect(fallbackFormatFor('jpeg')).toBe('jpeg');
    expect(fallbackFormatFor('png')).toBe('png');
    expect(fallbackFormatFor('webp')).toBe('webp');
    expect(fallbackFormatFor('avif')).toBe('avif');
    expect(fallbackFormatFor('gif')).toBe('png');
  });
});

describe('imageBaseName', () => {
  it('slugifies the file name', () => {
    expect(imageBaseName('/site/blog/My Hero Photo.JPG')).toBe('my-hero-photo');
    expect(imageBaseName('/site/!!!.png')).toBe('image');
  });
});

describe('planCopy', () => {
  it('names the copy after the content hash', () => {
    expect(planCopy('/site/blog/hero.jpeg', 'abcdef0123456789', 'jpeg')).toEqual({
      key: 'copy:_img/hero-abcdef01.jpg',
      relPath: '_img/hero-abcdef01.jpg',
      url: '/_img/hero-abcdef01.jpg',
    });
  });
});

describe('planVariants', () => {
  const input = {
    filePath: '/public/images/hero.jpg',
    sourceHash: 'a'.repeat(64),
    format: 'jpeg' as const,
    width: 1600,
    responsive,
    providerVersion: '@stati/images@1.0.0',
  };

  it('plans every width in each modern format plus the fallback format', () => {
    const plan = planVariants(input);
    const name = plan.outputs[0]!.relPath.match(/_img\/(hero-[0-9a-f]{8})-480\.avif/)![1];

    expect(plan.outputs.map((output) => output.relPath)).toEqual([
      `_img/${name}-480.avif`,
      `_img/${name}-960.avif`,
      `_img/${name}-1440.avif`,
      `_img/${name}-480.webp`,
      `_img/${name}-960.webp`,
      `_img/${name}-1440.webp`,
      `_img/${name}-480.jpg`,
      `_img/${name}-960.jpg`,
      `_img/${name}-1440.jpg`,
    ]);
    expect(plan.sources).toEqual([
      {
        type: 'image/avif',
        srcset: `/_img/${name}-480.avif 480w, /_img/${name}-960.avif 960w, /_img/${name}-1440.avif 1440w`,
      },
      {
        type: 'image/webp',
        srcset: `/_img/${name}-480.webp 480w, /_img/${name}-960.webp 960w, /_img/${name}-1440.webp 1440w`,
      },
    ]);
    expect(plan.fallback.src).toBe(`/_img/${name}-1440.jpg`);
    expect(plan.outputs.find((output) => output.format === 'jpeg')).toMatchObject({ quality: 80 });
  });

  it('keeps PNG fallbacks lossless', () => {
    const plan = planVariants({ ...input, filePath: '/public/logo.png', format: 'png' });
    expect(plan.outputs.filter((output) => output.format === 'png')).not.toContainEqual(
      expect.objectContaining({ quality: expect.anything() }),
    );
  });

  it('drops a modern format that the fallback already covers', () => {
    const plan = planVariants({ ...input, filePath: '/public/photo.webp', format: 'webp' });
    expect(plan.sources.map((source) => source.type)).toEqual(['image/avif']);
    expect(plan.fallback.src).toMatch(/\.webp$/);
  });

  it('gives the same source and options the same URLs, and changes them otherwise', () => {
    const base = planVariants(input).fallback.src;
    expect(planVariants(input).fallback.src).toBe(base);
    expect(planVariants({ ...input, sourceHash: 'b'.repeat(64) }).fallback.src).not.toBe(base);
    expect(
      planVariants({
        ...input,
        responsive: { ...responsive, quality: { ...responsive.quality, jpeg: 70 } },
      }).fallback.src,
    ).not.toBe(base);
    expect(
      planVariants({ ...input, providerVersion: '@stati/images@1.1.0' }).fallback.src,
    ).not.toBe(base);
  });

  it('gives identical files under different names their own job, and shares one per name', () => {
    const hero = planVariants(input);
    const banner = planVariants({ ...input, filePath: '/public/images/banner.jpg' });
    expect(banner.key).not.toBe(hero.key);
    expect(banner.fallback.src).toMatch(/^\/_img\/banner-/);

    // The same file name in another folder writes the same outputs, so the job is shared
    expect(planVariants({ ...input, filePath: '/site/blog/hero.jpg' }).key).toBe(hero.key);
  });
});
