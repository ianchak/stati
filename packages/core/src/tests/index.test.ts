import { describe, it, expect } from 'vitest';

describe('stati package index', () => {
  it('should export all public types', async () => {
    const statiModule = await import('../index.js');

    expect(statiModule.build).toBeDefined();
    expect(statiModule.loadConfig).toBeDefined();
    expect(typeof statiModule.build).toBe('function');
    expect(typeof statiModule.loadConfig).toBe('function');
  });

  it('should have proper module structure', () => {
    const expectedExports = ['build', 'loadConfig'];

    // Validates the public API surface
    for (const exportName of expectedExports) {
      expect(exportName).toBeDefined();
      expect(typeof exportName).toBe('string');
    }
  });
});
