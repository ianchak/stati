/**
 * Sass/SCSS setup processor for the Stati scaffolder.
 * Generates Sass configuration and converts existing CSS to SCSS for new projects.
 * @module create-stati/sass-processor
 */

import { DEPENDENCY_VERSIONS } from './constants.js';
import type { ProcessorResultWithDeletions } from './types.js';

/**
 * Generate Sass setup files and dependencies.
 * Returns all files and configuration needed for Sass support.
 *
 * This processor requires the existing CSS content to convert to SCSS with variables.
 *
 * @param existingCSS - The existing CSS content to enhance with Sass features
 * @returns Processor result with files, dependencies, scripts, and files to delete
 *
 * @example
 * ```typescript
 * const existingCSS = await readFile('public/styles.css', 'utf-8');
 * const sassSetup = setupSass(existingCSS);
 * // sassSetup.files contains: src/styles.scss
 * // sassSetup.devDependencies contains: { sass: '^1.77.0', ... }
 * // sassSetup.scripts contains: { 'build:css': '...', 'watch:css': '...', ... }
 * // sassSetup.filesToDelete contains: ['public/styles.css']
 * ```
 */
export function setupSass(existingCSS: string): ProcessorResultWithDeletions {
  return {
    files: new Map([['src/styles.scss', generateScssContent(existingCSS)]]),
    devDependencies: {
      sass: DEPENDENCY_VERSIONS.sass,
      concurrently: DEPENDENCY_VERSIONS.concurrently,
    },
    scripts: {
      'build:css': 'sass src/styles.scss dist/styles.css --style=compressed',
      'watch:css': 'sass src/styles.scss dist/styles.css --watch',
      build: 'stati build && npm run build:css',
      dev: 'concurrently --prefix none "npm run watch:css" "stati dev"',
    },
    filesToDelete: ['public/styles.css'],
  };
}

/**
 * Generate SCSS content with Sass variables and mixins from existing CSS.
 * Replaces common values with Sass variables for better maintainability.
 *
 * @param existingCSS - The existing CSS content to enhance
 * @returns SCSS content with variables and mixins
 */
function generateScssContent(existingCSS: string): string {
  const enhancedCSS = existingCSS
    .replace(/#007bff/g, '$primary-color')
    .replace(/#6c757d/g, '$secondary-color')
    .replace(/768px/g, '$breakpoint-tablet')
    .replace(/-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif/g, '$font-stack');

  return `// Variables
$primary-color: #007bff;
$secondary-color: #6c757d;
$font-stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
$breakpoint-tablet: 768px;

// Mixins
@mixin responsive($breakpoint) {
  @if $breakpoint == tablet {
    @media (min-width: $breakpoint-tablet) { @content; }
  }
}

// Enhanced styles with Sass variables
${enhancedCSS}
`;
}
