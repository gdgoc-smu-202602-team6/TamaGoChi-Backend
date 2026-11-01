import type { Id } from '../../../../foundation/id/id.js';

/**
 * A note left in someone's room (merged 9.2). It shows only within the club it was written in; the room's owner sees
 * all of theirs. Its author or the owner may delete it; a deleted account leaves it with no author.
 */
export class GuestbookEntry {
  constructor(
    readonly id: Id<'GuestbookEntry'>,
    /** The room's owner. */
    readonly ownerId: Id<'User'>,
    /** The club it was written in. */
    readonly clubId: Id<'Club'>,
    /** Null once the author deleted their account. */
    readonly authorUserId: Id<'User'> | null,
    readonly body: string,
    readonly createdAt: Date,
  ) {}

  /** Nobody writes in their own room (9.2). */
  static mayBeWritten(ownerId: Id<'User'>, authorId: Id<'User'>): boolean {
    return ownerId !== authorId;
  }

  mayBeDeletedBy(userId: Id<'User'>): boolean {
    return userId === this.authorUserId || userId === this.ownerId;
  }

  /** New to the owner: written after they last opened their guestbook (M-21). */
  isNewSince(checkedAt: Date | null): boolean {
    return !checkedAt || this.createdAt > checkedAt;
  }
}
