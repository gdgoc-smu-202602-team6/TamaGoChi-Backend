/** Whether users are members of a same club (seeing a friend's room). The club domain implements it. */
export abstract class SharedClubs {
  /** Those of `others` who share at least one club with `userId`. */
  abstract sharingWith(
    userId: string,
    others: readonly string[],
  ): Promise<ReadonlySet<string>>;
}
