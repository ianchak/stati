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

export interface StylingOptions {
  /** Carry the template's public/styles.css over instead of using processor starter styles. */
  keepTemplateStyles?: boolean;
}

function readTemplateCSS(projectDir: string): Promise<string> {
  return readFile(join(projectDir, 'public', 'styles.css'), 'utf-8');
}

/**
 * Get the processor result for a given styling option.
 * For Sass, requires reading the existing CSS file first.
 *
 * @param styling - The styling option selected
 * @param projectDir - The project directory (needed for Sass to read existing CSS)
 * @param options - Template-specific styling behavior
 * @returns The processor result, or null for plain CSS
 */
export async function getStylingProcessor(
  styling: StylingOption,
  projectDir: string,
  options: StylingOptions = {},
): Promise<ProcessorResult | ProcessorResultWithDeletions | null> {
  switch (styling) {
    case 'tailwind':
      return options.keepTemplateStyles
        ? setupTailwind(await readTemplateCSS(projectDir))
        : setupTailwind();

    case 'sass':
      // Convert the existing CSS to SCSS
      return setupSass(await readTemplateCSS(projectDir));

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
 * @param options - Template-specific styling behavior
 */
export async function processStyling(
  projectDir: string,
  styling: StylingOption,
  options: StylingOptions = {},
): Promise<void> {
  try {
    const result = await getStylingProcessor(styling, projectDir, options);

    if (result) {
      await applyProcessorResult(projectDir, result);
    }
  } catch (error) {
    throw new Error(`Failed to setup ${styling}: ${formatErrorMessage(error)}`, { cause: error });
  }
}
