/**
 * Creates the database at DATABASE_URL when it is empty: prisma/schema.sql (built by prisma/build-schema.ts) and the
 * first data (prisma/seed/*.sql) in one transaction. After that the database is the data's source of truth, and a
 * database that already has the schema is left as it is. One deploy at a time (advisory lock).
 */
import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';

const seedFolder = 'prisma/seed';

async function create(client: pg.Client): Promise<void> {
  const { rows } = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('public.users') IS NOT NULL AS exists",
  );
  if (rows[0].exists) {
    console.log('the schema is already there, nothing to apply');
    return;
  }
  await client.query('BEGIN');
  try {
    await client.query(readFileSync('prisma/schema.sql', 'utf8'));
    for (const name of readdirSync(seedFolder)
      .filter((one) => one.endsWith('.sql'))
      .sort())
      await client.query(readFileSync(`${seedFolder}/${name}`, 'utf8'));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
  console.log('schema applied to an empty database');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtext('prisma/deploy.ts'))");
  await create(client);
} finally {
  await client.end();
}
