/**
 * Tests for the `search` configuration block.
 * @module search/config.test
 */

import { describe, expect, it } from 'vitest';
import { validateSearchConfig } from '../../src/search/config.js';
import { ConfigValidationError } from '../../src/config/errors.js';

describe('validateSearchConfig', () => {
  it('accepts no block, no fields and a list of field names', () => {
    expect(() => validateSearchConfig(undefined)).not.toThrow();
    expect(() => validateSearchConfig({ enabled: true })).not.toThrow();
    expect(() => validateSearchConfig({ enabled: true, fields: [] })).not.toThrow();
    expect(() =>
      validateSearchConfig({ enabled: true, fields: ['description', 'date', 'section'] }),
    ).not.toThrow();
  });

  it('leaves a block that is not an object to the other checks', () => {
    expect(() => validateSearchConfig(true)).not.toThrow();
    expect(() => validateSearchConfig(null)).not.toThrow();
  });

  it('rejects fields that is not an array', () => {
    expect(() => validateSearchConfig({ fields: 'description' })).toThrow(ConfigValidationError);
    expect(() => validateSearchConfig({ fields: 'description' })).toThrow(
      `search.fields must be an array of front matter field names, such as ['description', 'date'] (got "description").`,
    );
    expect(() => validateSearchConfig({ fields: { description: true } })).toThrow(
      'search.fields must be an array',
    );
  });

  it('rejects an entry that is not a field name', () => {
    expect(() => validateSearchConfig({ fields: ['description', 3] })).toThrow(
      'search.fields[1] must be a front matter field name (got 3).',
    );
    expect(() => validateSearchConfig({ fields: [''] })).toThrow('search.fields[0]');
    expect(() => validateSearchConfig({ fields: ['  '] })).toThrow('search.fields[0]');
    expect(() => validateSearchConfig({ fields: ['date', ' description'] })).toThrow(
      'search.fields[1] must be a front matter field name (got " description").',
    );
    expect(() => validateSearchConfig({ fields: [null] })).toThrow(
      'search.fields[0] must be a front matter field name (got null).',
    );
  });

  it('describes values JSON cannot print', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => validateSearchConfig({ fields: circular })).toThrow(
      'search.fields must be an array',
    );
    expect(() => validateSearchConfig({ fields: [undefined] })).toThrow(
      'search.fields[0] must be a front matter field name (got undefined).',
    );
  });
});
