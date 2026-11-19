import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/{unit,integration,e2e}/**/*.test.ts'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/application/**'],
      exclude: ['src/application/ports/**'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
