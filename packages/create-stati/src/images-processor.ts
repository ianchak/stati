/**
 * Image tools setup for the Stati scaffolder.
 * Adds @stati/images and turns on responsive images and Open Graph cards, or removes the
 * starter's card template and fonts when image tools are not chosen.
 * @module create-stati/images-processor
 */

import { DEPENDENCY_VERSIONS } from './constants.js';
import type { TemplateName } from './examples.js';
import type { ProcessorResultWithDeletions } from './types.js';

/** A font a starter's Open Graph template uses, as written into `images.og.fonts`. */
interface OgFont {
  name: string;
  path: string;
  weight: number;
}

/**
 * What each template ships for Open Graph cards. Blank uses the card built into
 * @stati/images, so it has no files of its own.
 */
export const TEMPLATE_OG_ASSETS: Record<TemplateName, { paths: string[]; fonts: OgFont[] }> = {
  blank: { paths: [], fonts: [] },
  blog: {
    paths: ['site/og.eta', 'og'],
    fonts: [{ name: 'Young Serif', path: './og/fonts/young-serif-regular.woff', weight: 400 }],
  },
  docs: {
    paths: ['site/og.eta', 'og'],
    fonts: [
      { name: 'Inter', path: './og/fonts/inter-semibold.woff', weight: 600 },
      { name: 'Inter', path: './og/fonts/inter-extrabold.woff', weight: 800 },
    ],
  },
};

/**
 * Builds the `images` block for a template's config, indented for `defineConfig({ ... })`.
 *
 * @param template - The chosen template
 * @returns The block, without a trailing comma
 */
export function imagesConfigBlock(template: TemplateName): string {
  const { fonts } = TEMPLATE_OG_ASSETS[template];
  const ogLines: string[] = [];
  if (fonts.length > 0) {
    ogLines.push('      fonts: [');
    for (const font of fonts) {
      ogLines.push(
        `        { name: '${font.name}', path: '${font.path}', weight: ${font.weight} },`,
      );
    }
    ogLines.push('      ],');
  }

  const og = ogLines.length > 0 ? ['    og: {', ...ogLines, '    },'] : ['    og: true,'];
  return [
    '  // Responsive AVIF/WebP images and a link preview card for every page (@stati/images).',
    ...(fonts.length > 0 ? ['  // The card is drawn from site/og.eta.'] : []),
    '  images: {',
    '    responsive: true,',
    ...og,
    '  }',
  ].join('\n');
}

/**
 * Sets up image tools for a new project.
 *
 * @param template - The chosen template
 * @param enabled - Whether the user chose image tools
 * @returns The dependency to add, or the starter files to remove when image tools are off
 */
export function setupImages(
  template: TemplateName,
  enabled: boolean,
): ProcessorResultWithDeletions {
  if (!enabled) {
    return {
      files: new Map(),
      devDependencies: {},
      scripts: {},
      filesToDelete: [...TEMPLATE_OG_ASSETS[template].paths],
    };
  }
  return {
    files: new Map(),
    devDependencies: { '@stati/images': DEPENDENCY_VERSIONS['@stati/images'] },
    scripts: {},
  };
}
