import type { ClubName } from './club-name.js';
import type { InviteCode } from './invite-code.js';

/** A club. `revision` grows with every change and is the ETag; memberCount is counted when read. */
export class Club {
  constructor(
    readonly id: string,
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
