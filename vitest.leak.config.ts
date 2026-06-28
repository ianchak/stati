import { defineConfig } from 'vitest/config';

/**
 * Dedicated Vitest config for the dev-server leak regression test.
 *
 * Runs in a forked worker with `--expose-gc` so the test can force GC and assert
 * that live heap stays flat across many template rebuilds. Used by `npm run test:dev-leak`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['packages/core/test/perf/dev-server-leak.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--expose-gc'],
      },
    },
  },
  esbuild: {
    target: 'node18',
  },
});
