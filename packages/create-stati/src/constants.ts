/**
 * Centralized dependency versions for create-stati.
 * Single source of truth for all tooling versions used in scaffolded projects.
 */

export const DEPENDENCY_VERSIONS = {
  // CSS Processors
  sass: '^1.77.0',
  tailwindcss: '^4.3.3',
  '@tailwindcss/cli': '^4.3.3',
  // Build Tools
  concurrently: '^9.0.0',
  // TypeScript
  typescript: '^6.0.3',
  // Image tools
  '@stati/images': '^1.0.0',
} as const;
