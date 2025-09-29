import { describe, it, expect } from 'vitest';
import { getStatiVersion } from '../../core/utils/version.js';

describe('getStatiVersion', () => {
  it('should return the correct version from package.json', () => {
    const version = getStatiVersion();

    // Version should not be the fallback value
    expect(version).not.toBe('1.0.0');

    // Version should match semantic versioning pattern
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);

    // Version should be the actual version from package.json
    expect(version).toBe('1.6.0');
  });

  it('should return a valid version string', () => {
    const version = getStatiVersion();

    // Should be a non-empty string
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);

    // Should follow semver pattern (at least major.minor.patch)
    const semverPattern = /^\d+\.\d+\.\d+/;
    expect(version).toMatch(semverPattern);
  });
});
