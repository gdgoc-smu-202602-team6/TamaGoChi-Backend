import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { SharedClubs } from '../../../foundation/membership/shared-clubs.js';

@Injectable()
export class MemberSharedClubs extends SharedClubs {
  constructor(private readonly database: DatabaseClient) {
    super();
  }

  async sharingWith(
    userId: string,
    others: readonly string[],
  ): Promise<ReadonlySet<string>> {
    if (others.length === 0) return new Set();
    const rows = await this.database.clubMember.findMany({
      where: {
        userId: { in: [...others] },
        club: { members: { some: { userId } } },
      },
      select: { userId: true },
    });
    return new Set(rows.map((row) => row.userId));
  }
}
