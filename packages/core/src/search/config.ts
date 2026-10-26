/**
 * Validation for the `search` configuration block.
 * @module search/config
 */

import { ConfigValidationError } from '../config/errors.js';

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Checks `search.fields`: an array of front matter field names. The other options are not
 * validated here.
 *
 * @param search - The `search` value from the config file
 * @throws {ConfigValidationError} For a `fields` value that is not an array of non-empty strings
 */
export function validateSearchConfig(search: unknown): void {
  if (typeof search !== 'object' || search === null) {
    return;
  }

  const fields = (search as Record<string, unknown>).fields;
  if (fields === undefined) {
    return;
  }
  if (!Array.isArray(fields)) {
    throw new ConfigValidationError(
      `search.fields must be an array of front matter field names, such as ['description', 'date'] (got ${describe(fields)}).`,
    );
  }
  fields.forEach((field: unknown, index) => {
    if (typeof field !== 'string' || field === '' || field !== field.trim()) {
      throw new ConfigValidationError(
        `search.fields[${index}] must be a front matter field name (got ${describe(field)}).`,
      );
    }
  });
}
