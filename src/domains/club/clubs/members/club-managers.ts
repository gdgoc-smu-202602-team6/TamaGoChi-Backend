import type { Id } from '../../../../foundation/id/id.js';
import type { Permission } from '../access/permission.js';
import { MemberRole } from './member-role.js';

/** The members of one club who hold members.manage. Invariant: a club never drops to none. */
export class ClubManagers {
  /** The permission whose holders must never drop to zero in a club. */
  static readonly permission: Permission = 'members.manage';

  constructor(private readonly memberIds: ReadonlySet<Id<'Member'>>) {}

  /** Whether the member may take `role`: not when they are the last manager and the role does not manage. */
  allowRole(memberId: Id<'Member'>, role: MemberRole): boolean {
    return (
      MemberRole.permissionsOf(role).has(ClubManagers.permission) ||
      this.allowLeaving(memberId)
    );
  }

  /** Whether the member may leave or be removed: not when they are the last manager. */
  allowLeaving(memberId: Id<'Member'>): boolean {
    return !(this.memberIds.size === 1 && this.memberIds.has(memberId));
  }
}
