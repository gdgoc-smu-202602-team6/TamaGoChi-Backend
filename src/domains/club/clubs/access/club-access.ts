import type { Permission } from './permission.js';

/** A member's standing in one club. */
export interface ClubAccess {
  readonly memberId: string;
  readonly permissions: ReadonlySet<Permission>;
}
