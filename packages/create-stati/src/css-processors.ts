/**
 * CSS processor orchestration for the Stati scaffolder.
 * Coordinates the setup of different CSS solutions (Sass, Tailwind).
 * @module create-stati/css-processors
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { formatErrorMessage, applyProcessorResult } from './utils/index.js';
import { setupTailwind } from './tailwind-processor.js';
import { setupSass } from './sass-processor.js';
import type { ProcessorResult, ProcessorResultWithDeletions } from './types.js';

// Re-export processor utilities for backward compatibility
export { applyProcessorResult, writeProcessorFiles } from './utils/index.js';

export type StylingOption = 'css' | 'sass' | 'tailwind';

/**
 * Get the processor result for a given styling option.
 * For Sass, requires reading the existing CSS file first.
 *
 * @param styling - The styling option selected
 * @param projectDir - The project directory (needed for Sass to read existing CSS)
 * @returns The processor result, or null for plain CSS
 */
export async function getStylingProcessor(
  styling: StylingOption,
  projectDir: string,
): Promise<ProcessorResult | ProcessorResultWithDeletions | null> {
  switch (styling) {
    case 'tailwind':
      return setupTailwind();

    case 'sass': {
      // Read existing CSS to convert to SCSS
      const cssPath = join(projectDir, 'public', 'styles.css');
      const existingCSS = await readFile(cssPath, 'utf-8');
      return setupSass(existingCSS);
    }

    case 'css':
      // Plain CSS, no processing needed
      return null;

    default:
      throw new Error(`Unsupported styling option: ${styling}`);
  }
}

/**
 * Process styling for a project.
 * High-level function that orchestrates the complete styling setup.
 *
 * @param projectDir - The project directory
 * @param styling - The styling option selected
 */
export async function processStyling(projectDir: string, styling: StylingOption): Promise<void> {
  try {
    const result = await getStylingProcessor(styling, projectDir);

    if (result) {
      await applyProcessorResult(projectDir, result);
    }
  } catch (error) {
    throw new Error(`Failed to setup ${styling}: ${formatErrorMessage(error)}`);
  }
}
