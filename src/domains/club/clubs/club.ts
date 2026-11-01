import type { Id } from '../../../foundation/id/id.js';
import type { Permission } from './access/permission.js';
import type { ClubName } from './club-name.js';
import type { InviteCode } from './invite-code.js';

/** A club. `revision` grows with every change and is the ETag; memberCount is counted when read. */
export class Club {
  /** The permission that changes the club and its invite code; its holders see the invite code. */
  static readonly updatedWith: Permission = 'club.update';

  constructor(
    readonly id: Id<'Club'>,
    readonly name: ClubName,
    readonly inviteCode: InviteCode,
    readonly revision: number,
    readonly memberCount: number,
    readonly createdAt: Date,
  ) {}

  get etag(): string {
    return `"${this.revision}"`;
  }
}
