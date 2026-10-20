import { defineConfig } from 'vitest/config';
import { alias, oxcOptions } from './vitest.config';

// Dedicated real-API gate. Unit `*.test.ts(x)` files are never discovered here,
// and `test/*.live.ts` is never discovered by the unit suite.
export default defineConfig({
  resolve: { alias },
  oxc: oxcOptions,
  test: {
    include: ['test/**/*.live.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
