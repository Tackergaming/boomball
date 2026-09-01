import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['ai/sweep.report.test.ts'],
    testTimeout: 30 * 60 * 1000,
  },
});
