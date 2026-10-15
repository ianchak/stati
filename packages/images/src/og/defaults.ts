/**
 * The built-in Open Graph card: its template and the fonts it uses.
 * @module og/defaults
 */

import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import type { OgDefaults } from '@stati/core/types';

/** Fonts bundled in `fonts/`: static Latin subsets of OFL fonts, as Satori cannot read WOFF2. */
const BUNDLED_FONTS = [
  { name: 'Archivo', file: 'archivo-extrabold-expanded.woff', weight: 800 },
  { name: 'Inter', file: 'inter-regular.woff', weight: 400 },
  { name: 'Inter', file: 'inter-medium.woff', weight: 500 },
  { name: 'Fira Code', file: 'fira-code-regular.woff', weight: 400 },
] as const;

/** Path of the built-in template, for documentation and tests. */
export const DEFAULT_TEMPLATE_URL = new URL('../../templates/og.eta', import.meta.url);

let defaults: Promise<OgDefaults> | undefined;

/**
 * Loads the built-in template and fonts once.
 */
export function loadOgDefaults(): Promise<OgDefaults> {
  defaults ??= (async () => {
    const [template, ...fonts] = await Promise.all([
      readFile(DEFAULT_TEMPLATE_URL, 'utf-8'),
      ...BUNDLED_FONTS.map((font) =>
        readFile(new URL(`../../fonts/${font.file}`, import.meta.url)),
      ),
    ]);
    return {
      template: template as string,
      fonts: BUNDLED_FONTS.map((font, index) => ({
        name: font.name,
        data: fonts[index] as Buffer,
        weight: font.weight,
      })),
    };
  })();
  return defaults;
}
