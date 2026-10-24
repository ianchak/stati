/**
 * Validation and defaults for the `css` configuration block.
 * @module css/config
 */

import type { CSSConfig } from '../types/index.js';
import { ConfigValidationError } from '../config/errors.js';

/** The `css` block with defaults applied for one build. */
export interface ResolvedCSSConfig {
  hash: boolean;
  minify: boolean;
  autoInject: boolean;
}

const CSS_KEYS = ['hash', 'minify', 'autoInject'] as const;

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Checks the `css` block: an object whose options are all true or false.
 *
 * @param css - The `css` value from the config file
 * @throws {ConfigValidationError} For a value that is not an object, an unknown option, or an
 *   option that is not a boolean
 */
export function validateCSSConfig(css: unknown): void {
  if (css === undefined) {
    return;
  }
  if (typeof css !== 'object' || css === null || Array.isArray(css)) {
    throw new ConfigValidationError(
      `css must be an object such as { hash: true } (got ${describe(css)}).`,
    );
  }

  const options = css as Record<string, unknown>;
  for (const [key, value] of Object.entries(options)) {
    if (!(CSS_KEYS as readonly string[]).includes(key)) {
      throw new ConfigValidationError(
        `Unknown option css.${key}. Allowed options: ${CSS_KEYS.join(', ')}.`,
      );
    }
    if (value !== undefined && typeof value !== 'boolean') {
      throw new ConfigValidationError(`css.${key} must be true or false (got ${describe(value)}).`);
    }
  }
}

/**
 * Applies the defaults: production builds hash and minify the stylesheet unless the config
 * turns it off, development builds never do. Auto-injection applies to both.
 *
 * @param css - The `css` block, if any
 * @param development - Whether this is a development build
 */
export function resolveCSSConfig(
  css: CSSConfig | undefined,
  development: boolean,
): ResolvedCSSConfig {
  return {
    hash: !development && (css?.hash ?? true),
    minify: !development && (css?.minify ?? true),
    autoInject: css?.autoInject ?? true,
  };
}
