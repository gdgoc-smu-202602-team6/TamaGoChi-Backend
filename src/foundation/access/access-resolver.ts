import type { Permission } from './permission.js';

/** What a user may do in a club. The club area implements it from memberships and roles. */
export abstract class AccessResolver {
  /** Null when the user is not a member of the club (the club is then not visible to them). */
  abstract permissionsOf(userId: string, clubId: string): Promise<ClubAccess | null>;
}

/** A member's standing in one club. */
export interface ClubAccess {
  readonly memberId: string;
  readonly permissions: ReadonlySet<Permission>;
}
