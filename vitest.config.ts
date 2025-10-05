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
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/dist/**',
        '**/node_modules/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/test/**',
        '**/tests/**',
        'examples/**',
        'docs-site/**',
        'scripts/**',
        '**/*.test.ts',
        '**/dev-types.d.ts',
      ],
    },
  },
  esbuild: {
    target: 'node18',
  },
});
