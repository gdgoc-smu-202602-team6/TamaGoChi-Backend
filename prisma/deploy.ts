/**
 * Brings the database at DATABASE_URL to this release (package.json `version`), then applies the seed. Follows
 * KodeKoreaIMS's release migrations:
 * - A database with no release recorded gets prisma/schema.sql (built by prisma/build-schema.ts) and this release as
 *   its baseline.
 * - Otherwise each prisma/releases/<x.y.z>.sql newer than the last release recorded, up to this one, runs in its own
 *   transaction with its row in schema_releases.
 * - A recorded release whose file changed or is gone, or a database newer than this release, is refused.
 * The seed files (prisma/seed/*.sql) are idempotent and run every time. One deploy at a time (advisory lock).
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';

interface Recorded {
  readonly version: string;
  readonly sha256: string;
  readonly baseline: boolean;
}

const releasesFolder = 'prisma/releases';
const seedFolder = 'prisma/seed';

const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

/** Orders x.y.z versions. */
function compare(a: string, b: string): number {
  const [x, y] = [a, b].map((one) => one.split('.').map(Number));
  for (let i = 0; i < 3; i += 1)
    if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

function releaseFiles(): Map<string, string> {
  if (!existsSync(releasesFolder)) return new Map();
  return new Map(
    readdirSync(releasesFolder)
      .filter((name) => /^\d+\.\d+\.\d+\.sql$/.test(name))
      .map((name) => [
        name.slice(0, -'.sql'.length),
        readFileSync(`${releasesFolder}/${name}`, 'utf8'),
      ]),
  );
}

async function inTransaction(
  client: pg.Client,
  work: () => Promise<void>,
): Promise<void> {
  await client.query('BEGIN');
  try {
    await work();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function migrate(client: pg.Client, current: string): Promise<void> {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_releases (
    version text PRIMARY KEY,
    sha256 text NOT NULL,
    baseline boolean NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const recorded = (
    await client.query<Recorded>(
      'SELECT version, sha256, baseline FROM schema_releases',
    )
  ).rows.sort((a, b) => compare(a.version, b.version));
  const files = releaseFiles();

  if (recorded.length === 0) {
    const schema = readFileSync('prisma/schema.sql', 'utf8');
    await inTransaction(client, async () => {
      await client.query(schema);
      await client.query(
        'INSERT INTO schema_releases (version, sha256, baseline) VALUES ($1, $2, true)',
        [current, sha256(schema)],
      );
    });
    console.log(`schema ${current} applied to an empty database`);
    return;
  }

  for (const row of recorded.filter((one) => !one.baseline)) {
    const file = files.get(row.version);
    if (file === undefined)
      throw new Error(
        `release ${row.version} was applied but its file is gone`,
      );
    if (sha256(file) !== row.sha256)
      throw new Error(`release ${row.version} changed after it was applied`);
  }
  const last = recorded.at(-1)!.version;
  if (compare(last, current) > 0)
    throw new Error(`the database is at ${last}, newer than ${current}`);

  const pending = [...files.keys()]
    .filter(
      (version) => compare(version, last) > 0 && compare(version, current) <= 0,
    )
    .sort(compare);
  for (const version of pending) {
    const sql = files.get(version)!;
    await inTransaction(client, async () => {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_releases (version, sha256, baseline) VALUES ($1, $2, false)',
        [version, sha256(sql)],
      );
    });
    console.log(`release ${version} applied`);
  }
  if (pending.length === 0)
    console.log(`schema is at ${last}, nothing to apply`);
}

async function seed(client: pg.Client): Promise<void> {
  for (const name of readdirSync(seedFolder)
    .filter((one) => one.endsWith('.sql'))
    .sort()) {
    await inTransaction(client, async () => {
      await client.query(readFileSync(`${seedFolder}/${name}`, 'utf8'));
    });
    console.log(`seed ${name} applied`);
  }
}

async function main(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const current = (
    JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
  ).version;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('schema_releases'))");
    await migrate(client, current);
    await seed(client);
  } finally {
    await client.end();
  }
}

await main();
