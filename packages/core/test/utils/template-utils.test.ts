import { describe, it, expect } from 'vitest';

import { propValue } from '../../src/core/utils/template.utils.js';

describe('propValue', () => {
  it('combines string arguments into a space-separated value', () => {
    expect(propValue('alpha', 'beta', 'gamma')).toBe('alpha beta gamma');
  });

  it('includes numeric values and ignores falsy arguments', () => {
    expect(propValue('count', 42, 0, '', null, undefined, false)).toBe('count 42');
  });

  it('flattens array inputs and filters out non-string values', () => {
    expect(propValue(['alpha', 'beta', null, undefined, 0, 1])).toBe('alpha beta 1');
  });

  it('includes keys from objects when their values are truthy', () => {
    expect(propValue({ foo: true, bar: false, baz: 'hello', qux: 0, quux: 1 })).toBe(
      'foo baz quux',
    );
  });

  it('combines mixed argument types into a single value', () => {
    expect(
      propValue('base', ['primary', undefined, ''], { active: true, disabled: false }, 123, null),
    ).toBe('base primary active 123');
  });

  it('ignores non-string primitive arguments such as booleans', () => {
    expect(propValue(true, 'valid', { ok: true })).toBe('valid ok');
  });
});
