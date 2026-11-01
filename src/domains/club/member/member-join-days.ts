import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { JoinDays } from '../../../foundation/membership/join-days.js';

/** A membership is created when its application is approved, so its creation is the approval moment. */
@Injectable()
export class MemberJoinDays extends JoinDays {
  constructor(private readonly database: DatabaseClient) {
    super();
  }

  async joinedAt(userId: string): Promise<readonly Date[]> {
    const rows = await this.database.clubMember.findMany({
      where: { userId },
      select: { createdAt: true },
    });
    return rows.map((row) => row.createdAt);
  }
}
