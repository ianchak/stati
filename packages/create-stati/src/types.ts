/**
 * Shared types for create-stati processors.
 * Provides a common interface for all setup processors (TypeScript, Tailwind, Sass).
 * @module create-stati/types
 */

/**
 * Common result interface for all setup processors.
 * Each processor returns files to write, dependencies to add, and scripts to configure.
 *
 * @example
 * ```typescript
 * const result: ProcessorResult = {
 *   files: new Map([
 *     ['config.json', '{ "enabled": true }'],
 *     ['src/index.ts', 'console.log("Hello");'],
 *   ]),
 *   devDependencies: { typescript: '^5.6.0' },
 *   scripts: { build: 'tsc' },
 * };
 * ```
 */
export interface ProcessorResult {
  /** Map of relative file path to file content */
  files: Map<string, string>;
  /** Dev dependencies to add to package.json */
  devDependencies: Record<string, string>;
  /** Scripts to add/override in package.json */
  scripts: Record<string, string>;
}

/**
 * Extended processor result that includes files to delete.
 * Used by processors that need to remove template files (e.g., Sass removes public/styles.css).
 */
export interface ProcessorResultWithDeletions extends ProcessorResult {
  /** Array of relative file paths to delete */
  filesToDelete?: string[];
}
