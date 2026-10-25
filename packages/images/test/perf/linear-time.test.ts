/**
 * Linear-time check for the OG image HTML parser.
 *
 * It asserts a wall-clock limit, which is too noisy for the coverage run in CI, so it lives with
 * the perf tests.
 *
 * Run: npx vitest run packages/images/test/perf/linear-time.test.ts
 * @module perf/linear-time.test
 */

import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { htmlToSatori } from '../../src/og/html.js';

describe('htmlToSatori', () => {
  it('takes linear time on input that never closes its tags', () => {
    // A regular expression that looks for `-->` or `>` after every `<` would take quadratic time
    for (const unit of ['<!--', '<!', '</', '<a ', '<a b="']) {
      const started = performance.now();
      htmlToSatori(unit.repeat(50_000));
      expect(performance.now() - started).toBeLessThan(1000);
    }
  });
});
