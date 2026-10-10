import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The balance sweep is hundreds of full matches per Tier. It is a report,
    // not a test, so it is kept out of `npm test` and run by `npm run sweep`.
    // `e2e/` holds Playwright specs, which share the `.spec.ts` suffix vitest
    // collects by default and cannot load under it. `npm run e2e` runs them.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'ai/sweep.report.test.ts'],
  },
});
