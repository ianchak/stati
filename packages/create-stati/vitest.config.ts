import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    mockReset: true,
    restoreMocks: true,
    // Explicitly include test files from the test directory
    include: ['test/**/*.test.ts'],
    // Exclude src directory from test discovery
    exclude: ['src/**/*'],
    coverage: {
      // Only include source files for coverage, exclude test files
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'test/**/*'],
      reporter: ['text', 'json', 'html'],
    },
  },
  esbuild: {
    target: 'node18',
  },
});
