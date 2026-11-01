import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://tamagochi:tamagochi@localhost:5432/tamagochi',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'e2e-secret-e2e-secret-e2e-secret-e2e',
      PUBLIC_URL: process.env.PUBLIC_URL ?? 'http://localhost:3000',
      TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS ?? 'https://web.example',
    },
  },
});
