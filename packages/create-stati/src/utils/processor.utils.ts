/**
 * Processor utilities for the Stati scaffolder.
 * Provides shared functions for applying processor results to projects.
 * @module create-stati/utils/processor
 */

import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { updatePackageJson } from './package-json.utils.js';
import type { ProcessorResult, ProcessorResultWithDeletions } from '../types.js';

/**
 * Write files from a processor result to a project directory.
 * This is a low-level utility that only writes files without updating package.json.
 *
 * @param projectDir - The project directory
 * @param files - Map of relative file paths to content
 *
 * @example
 * ```typescript
 * const files = new Map([
 *   ['config.json', '{ "enabled": true }'],
 *   ['src/index.ts', 'console.log("Hello");'],
 * ]);
 * await writeProcessorFiles('/path/to/project', files);
 * ```
 */
export async function writeProcessorFiles(
  projectDir: string,
  files: Map<string, string>,
): Promise<void> {
  for (const [relativePath, content] of files) {
    const filePath = join(projectDir, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }
}

/**
 * Delete files specified in a processor result.
 *
 * @param projectDir - The project directory
 * @param filesToDelete - Array of relative file paths to delete
 */
export async function deleteProcessorFiles(
  projectDir: string,
  filesToDelete: string[],
): Promise<void> {
  for (const relativePath of filesToDelete) {
    try {
      await unlink(join(projectDir, relativePath));
    } catch {
      // Ignore if file doesn't exist
    }
  }
}

/**
 * Apply a processor result to a project directory.
 * Writes files, updates package.json, and handles file deletions.
 *
 * @param projectDir - The project directory
 * @param result - The processor result to apply
 *
 * @example
 * ```typescript
 * const result = setupTailwind();
 * await applyProcessorResult('/path/to/project', result);
 * ```
 */
export async function applyProcessorResult(
  projectDir: string,
  result: ProcessorResult | ProcessorResultWithDeletions,
): Promise<void> {
  // Write all files
  await writeProcessorFiles(projectDir, result.files);

  // Delete files if specified (for processors like Sass that replace files)
  if ('filesToDelete' in result && result.filesToDelete) {
    await deleteProcessorFiles(projectDir, result.filesToDelete);
  }

  // Update package.json with dependencies and scripts
  await updatePackageJson(projectDir, {
    devDependencies: result.devDependencies,
    scripts: result.scripts,
  });
}
