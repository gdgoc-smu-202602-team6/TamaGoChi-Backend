import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export default defineConfig({
  schema: 'prisma/schema',
  // No Prisma migrations or seed: prisma/deploy.ts applies the built schema (with the first data) or the release files.
  datasource: { url: env('DATABASE_URL') },
});
