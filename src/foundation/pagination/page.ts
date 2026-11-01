import { type Cursor, encodeCursor } from './cursor.js';
import type { PageRequest } from './page-request.js';

export interface Page<T> {
  readonly items: readonly T[];
  /** Absent on the last page. */
  readonly nextPageToken?: string;
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
  return {
    items: items.map(map),
    nextPageToken: encodeCursor(query, last),
  };
}

/** The page as a list response carries it: each item turned into its body, and the token when another page follows. */
export function pageBody<T, B>(
  page: Page<T>,
  toBody: (item: T) => B,
): { items: B[]; nextPageToken?: string } {
  return {
    items: page.items.map(toBody),
    ...(page.nextPageToken ? { nextPageToken: page.nextPageToken } : {}),
  };
}
