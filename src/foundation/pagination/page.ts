import { BadRequest } from '../problem/problems/bad-request.js';

/**
 * Where the next page starts in a list ordered by (createdAt desc, id desc), or by (leadingKey desc, createdAt desc,
 * id desc) when the list sorts by a boolean column first (pinned notices).
 */
export interface Cursor {
  readonly createdAt: Date;
  readonly id: string;
  readonly leadingKey?: boolean;
}

export interface PageRequest {
  readonly size: number;
  /** Null for the first page. */
  readonly after: Cursor | null;
}

export interface Page<T> {
  readonly items: readonly T[];
  /** Absent on the last page. */
  readonly nextPageToken?: string;
}

const defaultSize = 50;

/**
 * Reads pageSize and pageToken for one list. `query` names the list and its filters; a token only works with the
 * query it came from (another query's token is 400).
 */
export function pageRequest(
  query: string,
  pageSize?: string | number,
  pageToken?: string,
): PageRequest {
  const size = pageSize === undefined ? defaultSize : Number(pageSize);
  if (!pageToken) return { size, after: null };
  try {
    const decoded = JSON.parse(
      Buffer.from(pageToken, 'base64url').toString('utf8'),
    ) as {
      q: string;
      t: string;
      i: string;
      g?: boolean;
    };
    if (decoded.q !== query) throw new Error('token from another query');
    return {
      size,
      after: {
        createdAt: new Date(decoded.t),
        id: decoded.i,
        ...(decoded.g !== undefined ? { leadingKey: decoded.g } : {}),
      },
    };
  } catch {
    throw new BadRequest([
      { field: '/query/pageToken', message: 'not a token of this list' },
    ]);
  }
}

/** Builds the page from `rows` fetched with `take: size + 1`. */
export function toPage<R extends Cursor, T>(
  query: string,
  request: PageRequest,
  rows: readonly R[],
  map: (row: R) => T,
): Page<T> {
  const items = rows.slice(0, request.size);
  if (rows.length <= request.size || items.length === 0)
    return { items: items.map(map) };
  const last = items[items.length - 1];
  const token = Buffer.from(
    JSON.stringify({
      q: query,
      t: last.createdAt.toISOString(),
      i: last.id,
      ...(last.leadingKey !== undefined ? { g: last.leadingKey } : {}),
    }),
  ).toString('base64url');
  return { items: items.map(map), nextPageToken: token };
}

/**
 * The Prisma `where` part that skips rows up to and including the cursor in (createdAt desc, id desc) order, or in
 * (`leadingField` desc, createdAt desc, id desc) order when the list sorts by that boolean column first.
 */
export function afterCursor(
  after: Cursor | null,
  leadingField?: string,
): object {
  if (!after) return {};
  const withinKey = {
    OR: [
      { createdAt: { lt: after.createdAt } },
      { createdAt: after.createdAt, id: { lt: after.id } },
    ],
  };
  if (!leadingField || after.leadingKey === undefined) return withinKey;
  return after.leadingKey
    ? {
        OR: [{ [leadingField]: false }, { [leadingField]: true, ...withinKey }],
      }
    : { [leadingField]: false, ...withinKey };
}
