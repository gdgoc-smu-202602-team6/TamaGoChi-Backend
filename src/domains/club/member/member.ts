/**
 * A member of a club, the subject of the game. The nickname is the account's; this keeps only what the club
 * decides. Invariant (kept by MemberRepository): a club always has at least one member with members.manage.
 */
export class Member {
  constructor(
    readonly id: string,
    readonly clubId: string,
    readonly userId: string,
    readonly partId: string,
    readonly roleId: string,
    readonly notificationsOn: boolean,
    /** The day the member joined is day 1. */
    readonly joinedAt: Date,
  ) {}
}

/** What a member update may change. Who may change which field is the caller's to check. */
export interface MemberChanges {
  readonly partId?: string;
  readonly roleId?: string;
  readonly notificationsOn?: boolean;
}
