/**
 * A note left in someone's room (merged 9.2). It shows only within the club it was written in; the room's owner sees
 * all of theirs. Its author or the owner may delete it; a deleted account leaves it with no author.
 */
export class GuestbookEntry {
  constructor(
    readonly id: string,
    /** The room's owner. */
    readonly userId: string,
    /** The club it was written in. */
    readonly clubId: string,
    /** Null once the author deleted their account. */
    readonly authorUserId: string | null,
    readonly body: string,
    readonly createdAt: Date,
  ) {}

  mayBeDeletedBy(userId: string): boolean {
    return userId === this.authorUserId || userId === this.userId;
  }

  /** New to the owner: written after they last opened their guestbook (M-21). */
  isNewSince(checkedAt: Date | null): boolean {
    return !checkedAt || this.createdAt > checkedAt;
  }
}
