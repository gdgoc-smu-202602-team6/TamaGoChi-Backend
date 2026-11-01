/**
 * Builds prisma/schema.sql, the whole schema of an empty database: the DDL Prisma states for the Prisma schema, a
 * DOMAIN for each contract schema a column is marked with (`/// contract: PaletteColor`, `/// contract:
 * DailyGoal.minutes`), each marked column turned to its DOMAIN, then each domain's SQL file in prisma/sql (what
 * neither Prisma nor the contract states). The value lists and formats stay in openapi.yaml only.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

interface ContractSchema {
  readonly type?: string | readonly string[];
  readonly enum?: readonly unknown[];
  readonly pattern?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly multipleOf?: number;
  readonly properties?: Readonly<Record<string, ContractSchema>>;
}

interface MarkedColumn {
  readonly table: string;
  readonly column: string;
  /** The contract schema, `Name` or `Name.property`. */
  readonly contract: string;
}

const baseTypes: Readonly<Record<string, string>> = {
  string: 'text',
  integer: 'integer',
};

/** Runs a CLI of this package and returns what it prints. */
function run(command: string, args: readonly string[]): string {
  return execFileSync(`node_modules/.bin/${command}`, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CHECKPOINT_DISABLE: '1' },
    maxBuffer: 64 * 1024 * 1024,
  });
}

const quoted = (name: string): string => `"${name}"`;
const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`;

/** The DOMAIN's name: the contract path in snake_case (`DailyGoal.minutes` → `daily_goal_minutes`). */
function domainName(contract: string): string {
  return contract
    .replaceAll('.', '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/** The marked columns of one Prisma schema file. */
function markedColumns(prismaSchema: string): MarkedColumn[] {
  const columns: MarkedColumn[] = [];
  for (const [, model = '', body = ''] of prismaSchema.matchAll(
    /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm,
  )) {
    const table = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? model;
    let pending: string | undefined;
    for (const line of body.split('\n').map((one) => one.trim())) {
      const mark = /^\/\/\/\s*contract:\s*(\S+)$/.exec(line);
      if (mark) {
        pending = mark[1];
      } else if (pending && line !== '' && !line.startsWith('//')) {
        const field = /^(\w+)\s/.exec(line)?.[1];
        if (!field || line.startsWith('@@'))
          throw new TypeError(
            `${model}: a contract mark is not followed by a field`,
          );
        columns.push({
          table,
          column: /@map\("([^"]+)"\)/.exec(line)?.[1] ?? field,
          contract: pending,
        });
        pending = undefined;
      }
    }
    if (pending)
      throw new TypeError(
        `${model}: a contract mark is not followed by a field`,
      );
  }
  return columns;
}

/** The contract schema at `Name` or `Name.property`. */
function contractSchema(
  schemas: Readonly<Record<string, ContractSchema>>,
  contract: string,
): ContractSchema {
  const [name = '', property] = contract.split('.');
  const schema = property
    ? schemas[name]?.properties?.[property]
    : schemas[name];
  if (!schema) throw new TypeError(`the contract has no schema ${contract}`);
  return schema;
}

/** `CREATE DOMAIN` for a contract schema: its base type, then its enum, pattern and bounds as one CHECK. */
function domain(contract: string, schema: ContractSchema): string {
  const type = [schema.type ?? []].flat().find((one) => one !== 'null') ?? '';
  const base = baseTypes[type];
  if (!base) throw new TypeError(`${contract}: no DOMAIN for type ${type}`);
  const checks = [
    ...(schema.enum
      ? [
          `VALUE IN (${schema.enum.map((value) => literal(String(value))).join(', ')})`,
        ]
      : []),
    ...(schema.pattern ? [`VALUE ~ ${literal(schema.pattern)}`] : []),
    ...(schema.minimum !== undefined ? [`VALUE >= ${schema.minimum}`] : []),
    ...(schema.maximum !== undefined ? [`VALUE <= ${schema.maximum}`] : []),
    ...(schema.multipleOf !== undefined
      ? [`VALUE % ${schema.multipleOf} = 0`]
      : []),
  ];
  if (checks.length === 0)
    throw new TypeError(`${contract}: the contract states nothing to check`);
  return `CREATE DOMAIN ${quoted(domainName(contract))} AS ${base} CHECK (${checks.join(' AND ')});`;
}

function build(): string {
  const contract = JSON.parse(
    run('redocly', ['bundle', 'openapi.yaml', '--ext', 'json']),
  ) as { components: { schemas: Record<string, ContractSchema> } };
  const ddl = run('prisma', [
    'migrate',
    'diff',
    '--from-empty',
    '--to-schema',
    'prisma/schema',
    '--script',
  ]);
  const columns = readdirSync('prisma/schema')
    .filter((name) => name.endsWith('.prisma'))
    .toSorted()
    .flatMap((name) =>
      markedColumns(readFileSync(`prisma/schema/${name}`, 'utf8')),
    );
  const contracts = [
    ...new Set(columns.map((column) => column.contract)),
  ].toSorted();
  const sqlFiles = readdirSync('prisma/sql')
    .filter((name) => name.endsWith('.sql'))
    .toSorted();

  const sections = [
    [
      '-- Generated by prisma/build-schema.ts from the Prisma schema, openapi.yaml and prisma/sql. Do not edit.',
    ],
    [ddl.trim()],
    [
      '-- A DOMAIN for each contract schema a column is marked with.',
      ...contracts.map((one) =>
        domain(one, contractSchema(contract.components.schemas, one)),
      ),
    ],
    [
      '-- Each marked column as its DOMAIN.',
      ...columns.map(
        (column) =>
          `ALTER TABLE ${quoted(column.table)} ALTER COLUMN ${quoted(column.column)} TYPE ${quoted(domainName(column.contract))};`,
      ),
    ],
    ...sqlFiles.map((name) => [
      `-- prisma/sql/${name}`,
      readFileSync(`prisma/sql/${name}`, 'utf8').trim(),
    ]),
  ];
  return `${sections.map((lines) => lines.join('\n')).join('\n\n')}\n`;
}

writeFileSync('prisma/schema.sql', build());
