/**
 * Sass/SCSS setup processor for the Stati scaffolder.
 * Generates Sass configuration and converts existing CSS to SCSS for new projects.
 * @module create-stati/sass-processor
 */

import { DEPENDENCY_VERSIONS } from './constants.js';
import type { ProcessorResultWithDeletions } from './types.js';

/** Sass's input and its output in the static directory, the file the templates link */
export const SASS_OUTPUT = 'public/styles.css';
const SASS_FILES = `src/styles.scss ${SASS_OUTPUT}`;

/** Font stack used by the blank template's stylesheet */
const FONT_STACK =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/**
 * Generate Sass setup files and dependencies.
 * Returns all files and configuration needed for Sass support.
 *
 * This processor requires the existing CSS content to convert to SCSS with variables.
 *
 * Sass compiles into `public/styles.css` before `stati build`, and `sass --watch` keeps it
 * current next to `stati dev`. The templates link `/styles.css` as they are; production
 * builds point that link at a copy named after its content, as with any stylesheet in
 * `public/`. The compiled file is a build output, which the generated .gitignore lists.
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
      'build:css': `sass ${SASS_FILES} --style=compressed --no-source-map`,
      'watch:css': `sass --watch ${SASS_FILES} --no-source-map`,
      build: 'npm run build:css && stati build',
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
  // Interpolate (#{...}) so the variables also work inside CSS custom properties
  const enhancedCSS = existingCSS
    .replace(/#2563eb/gi, '#{$primary-color}')
    .replace(/#475569/gi, '#{$secondary-color}')
    .replace(/768px/g, '$breakpoint-tablet')
    .replaceAll(FONT_STACK, '#{$font-stack}');

  return `// Variables
$primary-color: #2563eb;
$secondary-color: #475569;
$font-stack: ${FONT_STACK};
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
