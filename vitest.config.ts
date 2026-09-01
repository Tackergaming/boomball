import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The balance sweep is hundreds of full matches per Tier. It is a report,
    // not a test, so it is kept out of `npm test` and run by `npm run sweep`.
    exclude: ['**/node_modules/**', '**/dist/**', 'ai/sweep.report.test.ts'],
  },
});
