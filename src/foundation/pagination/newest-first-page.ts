import { afterCursor, type Cursor } from './cursor.js';
import type { PageRequest } from './page-request.js';
import { type Page, toPage } from './page.js';

/**
 * Reads one page of a list ordered by (createdAt desc, id desc). `fetch` runs the list's findMany with its own filters
 * and the given arguments: `after` is the `where` part that skips the rows before the page, and `take` is one more
 * than the page size, to tell whether another page follows.
 */
export async function newestFirstPage<R extends Cursor, T>(
  query: string,
  request: PageRequest,
  map: (row: R) => T,
  fetch: (window: {
    after: object;
    orderBy: ({ createdAt: 'desc' } | { id: 'desc' })[];
    take: number;
  }) => Promise<readonly R[]>,
): Promise<Page<T>> {
  const rows = await fetch({
    after: afterCursor(request.after),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: request.size + 1,
  });
  return toPage(query, request, rows, map);
}
