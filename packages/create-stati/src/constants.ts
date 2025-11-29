/**
 * Centralized dependency versions for create-stati.
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
  // TypeScript
  typescript: '^5.6.0',
} as const;
