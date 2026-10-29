import { Injectable } from '@nestjs/common';
import {
  AccessResolver,
  type ClubAccess,
} from '../../../foundation/access/access-resolver.js';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { roleColumns, toRole } from '../role/role.repository.js';

/** Resolves a user's access in a club from their membership and its role. */
@Injectable()
export class MemberAccessResolver extends AccessResolver {
  constructor(private readonly database: DatabaseClient) {
    super();
  }

  async permissionsOf(
    userId: string,
    clubId: string,
  ): Promise<ClubAccess | null> {
    const member = await this.database.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
      select: { id: true, role: { select: roleColumns } },
    });
    return member
      ? { memberId: member.id, permissions: toRole(member.role).permissions }
      : null;
  }
}
