import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'sh prisma/seed.sh',
  },
  datasource: { url: env('DATABASE_URL') },
});
