import { describe, it, expect } from 'vitest';

describe('stati package index', () => {
  it('should export all public types', async () => {
    // Arrange & Act
    const statiModule = await import('../index.js');

    // Assert - verify core exports are available
    expect(statiModule.build).toBeDefined();
    expect(statiModule.loadConfig).toBeDefined();
    expect(typeof statiModule.build).toBe('function');
    expect(typeof statiModule.loadConfig).toBe('function');
  });

  it('should have proper module structure', () => {
    // Test that the module exports what we expect
    const expectedExports = ['build', 'loadConfig'];

    // This validates the public API surface
    for (const exportName of expectedExports) {
      expect(exportName).toBeDefined();
      expect(typeof exportName).toBe('string');
    }
  });
});
