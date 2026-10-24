/**
 * Tests for the `css` configuration block.
 * @module css/config.test
 */

import { describe, expect, it } from 'vitest';
import { resolveCSSConfig, validateCSSConfig } from '../../src/css/config.js';
import { ConfigValidationError } from '../../src/config/errors.js';

describe('validateCSSConfig', () => {
  it('accepts no block and every boolean option', () => {
    expect(() => validateCSSConfig(undefined)).not.toThrow();
    expect(() => validateCSSConfig({})).not.toThrow();
    expect(() => validateCSSConfig({ hash: false, minify: true, autoInject: false })).not.toThrow();
  });

  it('rejects a block that is not an object', () => {
    expect(() => validateCSSConfig(true)).toThrow(ConfigValidationError);
    expect(() => validateCSSConfig(['hash'])).toThrow(
      'css must be an object such as { hash: true } (got ["hash"]).',
    );
  });

  it('rejects unknown options', () => {
    expect(() => validateCSSConfig({ hashed: true })).toThrow(
      'Unknown option css.hashed. Allowed options: hash, minify, autoInject.',
    );
  });

  it('rejects options that are not booleans', () => {
    expect(() => validateCSSConfig({ minify: 'yes' })).toThrow(
      'css.minify must be true or false (got "yes").',
    );
  });

  it('shows values JSON cannot print', () => {
    expect(() => validateCSSConfig({ hash: 10n })).toThrow(
      'css.hash must be true or false (got 10).',
    );
    expect(() => validateCSSConfig({ hash: Symbol('on') })).toThrow(
      'css.hash must be true or false (got Symbol(on)).',
    );
  });
});

describe('resolveCSSConfig', () => {
  it('hashes and minifies production builds by default', () => {
    expect(resolveCSSConfig(undefined, false)).toEqual({
      hash: true,
      minify: true,
      autoInject: true,
    });
  });

  it('never hashes or minifies development builds', () => {
    expect(resolveCSSConfig({ hash: true, minify: true }, true)).toEqual({
      hash: false,
      minify: false,
      autoInject: true,
    });
  });

  it('applies the settings in production', () => {
    expect(resolveCSSConfig({ hash: false, minify: false, autoInject: false }, false)).toEqual({
      hash: false,
      minify: false,
      autoInject: false,
    });
    expect(resolveCSSConfig({ autoInject: false }, true).autoInject).toBe(false);
  });
});
