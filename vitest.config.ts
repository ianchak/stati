import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Force Vitest to properly handle ES module mocking
    globals: false,
    mockReset: true,
    restoreMocks: true,
  },
  esbuild: {
    target: 'node18',
  },
});
