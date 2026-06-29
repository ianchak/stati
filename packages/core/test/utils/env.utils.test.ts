import { describe, it, expect } from 'vitest';
import { isEnabledEnvFlag } from '../../src/core/utils/env.utils.js';

describe('isEnabledEnvFlag', () => {
  it('returns true for supported truthy values', () => {
    expect(isEnabledEnvFlag('1')).toBe(true);
    expect(isEnabledEnvFlag('true')).toBe(true);
    expect(isEnabledEnvFlag('yes')).toBe(true);
    expect(isEnabledEnvFlag('on')).toBe(true);
  });

  it('is case-insensitive for supported values', () => {
    expect(isEnabledEnvFlag('TRUE')).toBe(true);
    expect(isEnabledEnvFlag('Yes')).toBe(true);
    expect(isEnabledEnvFlag('On')).toBe(true);
  });

  it('returns false for undefined, empty, or unsupported values', () => {
    expect(isEnabledEnvFlag(undefined)).toBe(false);
    expect(isEnabledEnvFlag('')).toBe(false);
    expect(isEnabledEnvFlag('0')).toBe(false);
    expect(isEnabledEnvFlag('false')).toBe(false);
    expect(isEnabledEnvFlag('off')).toBe(false);
    expect(isEnabledEnvFlag('random')).toBe(false);
  });
});
