import { defineConfig } from 'vitest/config';

// Testes contra as APIs públicas reais. Fora do CI por padrão: `npm run test:live`.
export default defineConfig({
  test: { include: ['test/live/**/*.test.ts'], testTimeout: 60000 },
});
