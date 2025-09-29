import { describe, it, expect } from 'vitest';
import { getStatiVersion } from '../../core/utils/version.js';

describe('Version Integration Tests', () => {
  it('should return correct version when called from built context', () => {
    // This test verifies that the version function works correctly
    // when called from the compiled JavaScript in the dist directory
    const version = getStatiVersion();

    // Should return the actual version from package.json
    expect(version).toBe('1.6.0');

    // Should not fall back to the default
    expect(version).not.toBe('1.0.0');
  });

  it('should be available for template context', () => {
    // Verify the function is accessible and returns a valid version
    // This simulates how it's used in templates.ts
    const version = getStatiVersion();

    // Create a mock generator context like in templates.ts
    const generatorContext = {
      version: version,
    };

    expect(generatorContext.version).toBe('1.6.0');
    expect(typeof generatorContext.version).toBe('string');
    expect(generatorContext.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
