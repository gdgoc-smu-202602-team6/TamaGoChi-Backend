/** Who gets a club's notice notifications (M-13). The club domain implements it. */
export abstract class NoticeAudience {
  /** The users of the club's members who turned notice notifications on. */
  abstract recipients(clubId: string): Promise<readonly string[]>;
}
