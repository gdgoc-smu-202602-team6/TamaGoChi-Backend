import { asId, type Id } from '../foundation/id/id.js';
import { BadRequest } from '../foundation/problem/problems/bad-request.js';

/** The word that names the caller in a path or a query (`/users/me`, `/clubs/{clubId}/members/me`, `?userId=me`). */
const me = 'me';

/** `id`, or `ownId` (the caller's own) when `id` is `me`; either way an id of the kind `ownId` is. */
export function resolveMe<K extends string>(id: string, ownId: Id<K>): Id<K> {
  return id === me ? ownId : asId<K>(id);
}

/** A list across clubs is only of the caller's own: anything but `userId=me` is 400. */
export function requireMe(userId: string | undefined): void {
  if (userId !== me)
    throw new BadRequest([
      {
        field: '/query/userId',
        message: 'listing across clubs needs userId=me',
      },
    ]);
}
