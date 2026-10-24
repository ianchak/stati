import { describe, expect, it } from 'vitest';
import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATE_OG_ASSETS, imagesConfigBlock, setupImages } from '../src/images-processor.js';
import { DEPENDENCY_VERSIONS } from '../src/constants.js';
import { TEMPLATE_NAMES } from '../src/examples.js';

const examplesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../examples');

describe('images processor', () => {
  it.each(TEMPLATE_NAMES)('lists %s starter files that exist', async (template) => {
    const assets = TEMPLATE_OG_ASSETS[template];
    for (const path of assets.paths) {
      await expect(access(join(examplesDir, template, path))).resolves.toBeUndefined();
    }
    for (const font of assets.fonts) {
      await expect(access(join(examplesDir, template, font.path))).resolves.toBeUndefined();
    }
  });

  it('adds @stati/images when image tools are chosen', () => {
    expect(setupImages('blog', true)).toEqual({
      files: new Map(),
      devDependencies: { '@stati/images': DEPENDENCY_VERSIONS['@stati/images'] },
      scripts: {},
    });
  });

  it('removes the starter card files when image tools are not chosen', () => {
    expect(setupImages('blog', false).filesToDelete).toEqual(['site/og.eta', 'og']);
    expect(setupImages('blank', false).filesToDelete).toEqual([]);
    expect(setupImages('docs', false).devDependencies).toEqual({});
  });

  it('builds the images config block for each template', () => {
    expect(imagesConfigBlock('blank')).toBe(
      [
        '  // Responsive AVIF/WebP images and a link preview card for every page (@stati/images).',
        '  images: {',
        '    responsive: true,',
        '    og: true,',
        '  }',
      ].join('\n'),
    );
    expect(imagesConfigBlock('blog')).toBe(
      [
        '  // Responsive AVIF/WebP images and a link preview card for every page (@stati/images).',
        '  // The card is drawn from site/og.eta.',
        '  images: {',
        '    responsive: true,',
        '    og: {',
        '      fonts: [',
        "        { name: 'Young Serif', path: './og/fonts/young-serif-regular.woff', weight: 400 },",
        '      ],',
        '    },',
        '  }',
      ].join('\n'),
    );
  });
});
