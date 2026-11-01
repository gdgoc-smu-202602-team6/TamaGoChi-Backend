/**
 * Where the next page starts in a list ordered by (createdAt desc, id desc), or by (leadingKey desc, createdAt desc,
 * id desc) when the list sorts by a boolean column first (pinned notices).
 */
export interface Cursor {
  readonly createdAt: Date;
  readonly id: string;
  readonly leadingKey?: boolean;
}

/** The page token that resumes the list `query` after `cursor`. */
export function encodeCursor(query: string, cursor: Cursor): string {
  return Buffer.from(
    JSON.stringify({
      q: query,
      t: cursor.createdAt.toISOString(),
      i: cursor.id,
      ...(cursor.leadingKey !== undefined ? { g: cursor.leadingKey } : {}),
    }),
  ).toString('base64url');
}

/** The cursor of a token from `encodeCursor`; throws if the token is broken or came from another query. */
export function decodeCursor(query: string, token: string): Cursor {
  const decoded = JSON.parse(
    Buffer.from(token, 'base64url').toString('utf8'),
  ) as {
    q: string;
    t: string;
    i: string;
    g?: boolean;
  };
  if (decoded.q !== query) throw new Error('token from another query');
  return {
    createdAt: new Date(decoded.t),
    id: decoded.i,
    ...(decoded.g !== undefined ? { leadingKey: decoded.g } : {}),
  };
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
