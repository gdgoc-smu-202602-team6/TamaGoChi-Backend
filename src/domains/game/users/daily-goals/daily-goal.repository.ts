import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../foundation/database/database-client.js';
import { orOnUniqueViolation } from '../../../../foundation/database/database-errors.js';
import { Day } from '../../day/day.js';
import { DailyGoal } from './daily-goal.js';
import { DailyGoalHistory } from './daily-goal-history.js';

@Injectable()
export class DailyGoalRepository {
  constructor(private readonly database: DatabaseClient) {}

  async history(userId: string): Promise<DailyGoalHistory> {
    const rows = await this.database.userDailyGoal.findMany({
      where: { userId },
      select: { startOn: true, minutes: true },
    });
    return new DailyGoalHistory(
      rows.map((row) => new DailyGoal(Day.fromDate(row.startOn), row.minutes)),
    );
  }

  /** 'duplicate': a version already starts on that day. */
  async create(
    userId: string,
    startOn: Day,
    minutes: number,
  ): Promise<DailyGoal | 'duplicate'> {
    return orOnUniqueViolation(async () => {
      await this.database.userDailyGoal.create({
        data: { userId, startOn: startOn.toDate(), minutes },
      });
      return new DailyGoal(startOn, minutes);
    }, 'duplicate');
  }
}
