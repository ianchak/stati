import { defineConfig } from 'vitest/config';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Force Vitest to properly handle ES module mocking
    globals: false,
    mockReset: true,
    restoreMocks: true,
    // The dev-server leak test needs --expose-gc; it runs via its own config (npm run test:dev-leak)
    exclude: [...configDefaults.exclude, '**/perf/dev-server-leak.test.ts'],
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
