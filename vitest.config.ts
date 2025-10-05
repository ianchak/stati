import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Force Vitest to properly handle ES module mocking
    globals: false,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/test/**',
        '**/tests/**',
        'examples/**',
        'docs-site/**',
        'scripts/**',
      ],
    },
  },
  esbuild: {
    target: 'node18',
  },
});
