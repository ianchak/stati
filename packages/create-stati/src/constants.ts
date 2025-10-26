/**
 * Centralized dependency versions for create-stati
 * Single source of truth for all tooling versions used in scaffolded projects.
 */

export const DEPENDENCY_VERSIONS = {
  // CSS Processors
  sass: '^1.77.0',
  tailwindcss: '^3.4.0',
  autoprefixer: '^10.4.0',
  postcss: '^8.4.0',
  // Build Tools
  concurrently: '^9.0.0',
} as const;

// Individual exports for convenience and clarity
export const SASS_VERSION = DEPENDENCY_VERSIONS.sass;
export const TAILWIND_VERSION = DEPENDENCY_VERSIONS.tailwindcss;
export const AUTOPREFIXER_VERSION = DEPENDENCY_VERSIONS.autoprefixer;
export const POSTCSS_VERSION = DEPENDENCY_VERSIONS.postcss;
export const CONCURRENTLY_VERSION = DEPENDENCY_VERSIONS.concurrently;

/**
 * Configuration object for CSS processor setup
 */
export interface CSSProcessorConfig {
  /** Dependencies to add to package.json devDependencies */
  devDependencies: Record<string, string>;
  /** Scripts to add/override in package.json scripts */
  scripts: {
    'build:css': string;
    'watch:css': string;
    build: string;
    dev: string;
    'copy:css'?: string; // Optional copy script for processors that need it
  };
}

/**
 * Sass/SCSS processor configuration
 * Uses Sass CLI to compile .scss files to CSS
 */
export const SASS_CONFIG: CSSProcessorConfig = {
  devDependencies: {
    sass: SASS_VERSION,
    concurrently: CONCURRENTLY_VERSION,
  },
  scripts: {
    'build:css': 'sass styles/main.scss public/styles.css --style=compressed',
    'watch:css': 'sass styles/main.scss public/styles.css --watch',
    build: 'npm run build:css && stati build',
    dev: 'concurrently --prefix none "npm run watch:css" "stati dev"',
  },
};

/**
 * Tailwind CSS processor configuration
 * Uses Tailwind CLI with PostCSS and Autoprefixer
 */
export const TAILWIND_CONFIG: CSSProcessorConfig = {
  devDependencies: {
    tailwindcss: TAILWIND_VERSION,
    autoprefixer: AUTOPREFIXER_VERSION,
    postcss: POSTCSS_VERSION,
    concurrently: CONCURRENTLY_VERSION,
  },
  scripts: {
    'build:css': 'tailwindcss -i src/styles.css -o public/styles.css --minify',
    'watch:css': 'tailwindcss -i src/styles.css -o public/styles.css --watch',
    'copy:css': "node -e \"require('fs').copyFileSync('public/styles.css', 'dist/styles.css')\"",
    build: 'stati build && npm run build:css && npm run copy:css',
    dev: 'concurrently --prefix none "npm run watch:css" "stati dev"',
  },
};
