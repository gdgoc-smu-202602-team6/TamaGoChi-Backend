import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://tamagochi:tamagochi@localhost:5432/tamagochi',
    },
  },
});
