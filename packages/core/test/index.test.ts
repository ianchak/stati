import { describe, it, expect } from 'vitest';

describe('stati package index', () => {
  it('should export all public types', async () => {
    const statiModule = await import('../src/index.js');

    expect(statiModule.build).toBeDefined();
    expect(statiModule.loadConfig).toBeDefined();
    expect(typeof statiModule.build).toBe('function');
    expect(typeof statiModule.loadConfig).toBe('function');
  });

  it('should provide functional API surface for build operations', async () => {
    const statiModule = await import('../src/index.js');

    // Verify the essential build function is properly exported and callable
    expect(() => {
      const buildFn = statiModule.build;
      // Function should not throw when accessed
      expect(buildFn).toBeInstanceOf(Function);
      expect(buildFn.length).toBe(0); // Build function has one optional parameter (defaults to {}), so length is 0
    }).not.toThrow();

    // Verify config loader is functional
    expect(() => {
      const loadConfigFn = statiModule.loadConfig;
      expect(loadConfigFn).toBeInstanceOf(Function);
    }).not.toThrow();
  });
});
