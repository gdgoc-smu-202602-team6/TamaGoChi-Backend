import { BadRequest } from '../problem/problems/bad-request.js';
import { type Cursor, decodeCursor } from './cursor.js';

export interface PageRequest {
  /** Names the list and its filters; the next page's token carries it, so it only resumes this list. */
  readonly query: string;
  readonly size: number;
  /** Null for the first page. */
  readonly after: Cursor | null;
}

/**
 * Reads pageSize and pageToken for one list. The contract gives pageSize its default and limits before a route runs.
 * `query` names the list and its filters; a token only works with the query it came from (another query's token is
 * 400).
 */
export function pageRequest(
  query: string,
  size: number,
  pageToken?: string,
): PageRequest {
  if (!pageToken) return { query, size, after: null };
  try {
    return { query, size, after: decodeCursor(query, pageToken) };
  } catch {
    throw new BadRequest([
      { field: '/query/pageToken', message: 'not a token of this list' },
    ]);
  }
}
