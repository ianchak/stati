/**
 * Finds and loads the optional `@stati/images` package.
 * @module images/provider
 */

import { createRequire } from 'node:module';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ImageProvider } from '../types/index.js';
import { IMAGES_PACKAGE_NAME } from '../constants.js';
import { getStatiVersion } from '../core/utils/index.js';

/** Provider contract version this core supports. */
export const SUPPORTED_PROVIDER_API_VERSION = 1;

/** Image features that need the package. */
export type ImageFeature = 'responsive' | 'og';

/**
 * Resolves the package from the project, as markdown-it plugins are, so it is found under
 * strict layouts such as pnpm's where core cannot see the project's dependencies.
 * Resolution walks up from the project, which also covers workspaces.
 *
 * @returns The resolved entry file, or null when the package is not installed
 */
export function resolveImagesPackage(cwd: string = process.cwd()): string | null {
  try {
    const require = createRequire(pathToFileURL(resolvePath(cwd, 'package.json')));
    return require.resolve(IMAGES_PACKAGE_NAME);
  } catch {
    return null;
  }
}

/**
 * The error shown when a feature is on but the package is missing.
 */
export function missingPackageMessage(features: ImageFeature[]): string {
  const names = features.map((feature) => `images.${feature}`).join(' and ');
  const verb = features.length > 1 ? 'require' : 'requires';
  return `${names} ${verb} ${IMAGES_PACKAGE_NAME}. Run: npm i -D ${IMAGES_PACKAGE_NAME}`;
}

/**
 * Checks that the package is installed and, when `load` is set, creates its provider.
 *
 * @param options.features - The features that are on; they decide the error message
 * @param options.load - Whether to import the package; false only checks it is installed
 * @returns The provider, or null when `load` is false
 * @throws {Error} When the package is missing, fails to load, or is incompatible
 */
export async function loadImageProvider(options: {
  features: ImageFeature[];
  load: boolean;
  cwd?: string;
}): Promise<ImageProvider | null> {
  const entry = resolveImagesPackage(options.cwd);
  if (!entry) {
    throw new Error(missingPackageMessage(options.features));
  }
  if (!options.load) {
    return null;
  }

  let provider: ImageProvider;
  try {
    const module = (await import(pathToFileURL(entry).href)) as {
      createImageProvider?: () => ImageProvider | Promise<ImageProvider>;
    };
    if (typeof module.createImageProvider !== 'function') {
      throw new Error(`${IMAGES_PACKAGE_NAME} does not export createImageProvider()`);
    }
    provider = await module.createImageProvider();
  } catch (error) {
    throw new Error(
      `Failed to load ${IMAGES_PACKAGE_NAME}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  if (provider?.apiVersion !== SUPPORTED_PROVIDER_API_VERSION) {
    throw new Error(
      `${IMAGES_PACKAGE_NAME} ${provider?.version ?? ''} is not compatible with @stati/core ${getStatiVersion()}. Update both packages.`.replace(
        /\s+/g,
        ' ',
      ),
    );
  }
  if (options.features.includes('og') && typeof provider.renderOgImage !== 'function') {
    throw new Error(
      `images.og needs a newer ${IMAGES_PACKAGE_NAME} (${provider.version}). Update the package.`,
    );
  }
  return provider;
}
