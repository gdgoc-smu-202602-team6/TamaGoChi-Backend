import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../foundation/database/database-client.js';
import { JoinDays } from '../../../foundation/membership/join-days.js';

/**
 * Approval moments from the approved applications. An application outlives the membership it made, so leaving or
 * being removed from a club keeps the day; creating a club approves nothing, so that day is not one.
 */
@Injectable()
export class ApplicationJoinDays extends JoinDays {
  constructor(private readonly database: DatabaseClient) {
    super();
  }

  async joinedAt(userId: string): Promise<readonly Date[]> {
    const rows = await this.database.clubApplication.findMany({
      where: { userId, state: 'APPROVED' },
      select: { decidedAt: true },
    });
    return rows.flatMap((row) => (row.decidedAt ? [row.decidedAt] : []));
  }
}
