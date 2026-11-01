import type { Id } from '../../../../foundation/id/id.js';
import type { Permission } from './permission.js';

/** A member's standing in one club. */
export interface ClubAccess {
  readonly memberId: Id<'Member'>;
  readonly permissions: ReadonlySet<Permission>;
}
