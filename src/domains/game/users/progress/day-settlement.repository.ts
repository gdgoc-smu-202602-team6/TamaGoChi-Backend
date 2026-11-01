import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import type { Id } from '../../../../foundation/id/id.js';
import { Day } from '../../day/day.js';
import { DaySettlement } from './day-settlement.js';
import { RoomCondition } from '../room/room-condition.js';

@Injectable()
export class DaySettlementRepository {
  constructor(private readonly database: DatabaseClient) {}

  /** The user's confirmed days, oldest first. */
  async all(userId: Id<'User'>): Promise<DaySettlement[]> {
    const rows = await this.database.userDaySettlement.findMany({
      where: { userId },
      orderBy: { day: 'asc' },
    });
    return rows.map(
      (row) =>
        new DaySettlement(
          Day.fromDate(row.day),
          row.studiedSeconds,
          row.attended,
          row.goalMet,
          new RoomCondition(
            row.hearts,
            row.bugs,
            row.bugProgressSeconds * 1000,
            row.attendanceStreak,
            row.absenceStreak,
          ),
        ),
    );
  }

  /** Confirms days. A day confirmed meanwhile is kept: both computed it from the same records. */
  async confirm(
    userId: Id<'User'>,
    settlements: readonly DaySettlement[],
  ): Promise<void> {
    if (settlements.length === 0) return;
    await this.database.userDaySettlement.createMany({
      data: settlements.map((one) => ({
        userId,
        day: one.day.toDate(),
        studiedSeconds: one.studiedSeconds,
        attended: one.attended,
        goalMet: one.goalMet,
        hearts: one.condition.hearts,
        bugs: one.condition.bugs,
        bugProgressSeconds: one.condition.bugProgressSeconds,
        attendanceStreak: one.condition.attendanceStreak,
        absenceStreak: one.condition.absenceStreak,
      })),
      skipDuplicates: true,
    });
  }
}
