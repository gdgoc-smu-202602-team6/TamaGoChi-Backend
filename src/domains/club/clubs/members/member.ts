import type { Id } from '../../../../foundation/id/id.js';
import type { ClubAccess } from '../access/club-access.js';
import { ClubManagers } from './club-managers.js';

/**
 * A member of a club, the subject of the game. The nickname is the account's; this keeps only what the club
 * decides. Invariant (ClubManagers): a club always has at least one member with members.manage.
 */
export class Member {
  constructor(
    readonly id: Id<'Member'>,
    readonly clubId: Id<'Club'>,
    readonly userId: Id<'User'>,
    readonly partId: Id<'Part'>,
    readonly roleId: Id<'Role'>,
    readonly notificationsOn: boolean,
    /** The day the member joined is day 1. */
    readonly joinedAt: Date,
  ) {}

  /**
   * Why the caller (`access`) may not make `changes` to the member `memberId`; null when they may. The part and
   * notifications are the member's own ('not-own'); the role needs members.manage ('not-manager').
   */
  static changeRefusal(
    access: ClubAccess,
    memberId: Id<'Member'>,
    changes: MemberChanges,
  ): MemberRefusal | null {
    const own = memberId === access.memberId;
    if (
      !own &&
      (changes.partId !== undefined || changes.notificationsOn !== undefined)
    )
      return 'not-own';
    if (
      changes.roleId !== undefined &&
      !access.permissions.has(ClubManagers.permission)
    )
      return 'not-manager';
    return null;
  }

  /** Why the caller may not remove the member `memberId`; null when they may. Leaving is one's own; removing someone else needs members.manage. */
  static removalRefusal(
    access: ClubAccess,
    memberId: Id<'Member'>,
  ): MemberRefusal | null {
    return memberId !== access.memberId &&
      !access.permissions.has(ClubManagers.permission)
      ? 'not-manager'
      : null;
  }
}

/** What a member update may change. Who may change which field: Member.changeRefusal. */
export interface MemberChanges {
  readonly partId?: Id<'Part'>;
  readonly roleId?: Id<'Role'>;
  readonly notificationsOn?: boolean;
}

/** Why a caller may not change or remove a member (Member.changeRefusal, Member.removalRefusal). */
export type MemberRefusal = 'not-own' | 'not-manager';
