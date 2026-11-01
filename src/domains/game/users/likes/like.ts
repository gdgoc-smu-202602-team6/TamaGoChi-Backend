import type { Id } from '../../../../foundation/id/id.js';

/** A user liking a room (9.2): one per user whichever club it was seen through, never of one's own room. */
export class Like {
  static allowed(ownerId: Id<'User'>, likerId: Id<'User'>): boolean {
    return ownerId !== likerId;
  }
}
