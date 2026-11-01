import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export default defineConfig({
  schema: 'prisma/schema',
  // No migrations: prisma/build-schema.ts builds the schema of an empty database (pnpm db:deploy).
  migrations: { seed: 'sh prisma/seed.sh' },
  datasource: { url: env('DATABASE_URL') },
});
