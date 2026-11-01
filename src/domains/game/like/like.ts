/** A user liking a room (9.2): one per user whichever club it was seen through, never of one's own room. */
export class Like {
  static allowed(ownerId: string, likerId: string): boolean {
    return ownerId !== likerId;
  }
}
