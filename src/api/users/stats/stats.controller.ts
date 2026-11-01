import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../foundation/auth/authenticated-user.js';
import type { components } from '../../../foundation/contract/openapi.js';
import { LevelCurve } from '../../../domains/game/level/level-curve.js';
import type { Stats } from '../../../domains/game/users/stats/stats.js';
import { PlayerViews } from '../player-views.js';
import { userIdsOf } from '../user-ids.js';

type StatsBody = components['schemas']['Stats'];

@Controller('users')
export class StatsController {
  constructor(private readonly players: PlayerViews) {}

  /** batchGetStats: the friend cards (R-01), in the order asked. */
  @Get('-/stats\\:batchGet')
  async batchGet(
    @CurrentUser() caller: AuthenticatedUser,
    @Query('userIds') userIds: string | string[],
  ): Promise<{ items: StatsBody[] }> {
    const users = await this.players.visible(caller, userIdsOf(userIds));
    const now = new Date();
    return {
      items: await Promise.all(
        users.map(async (user) =>
          toStatsBody(await this.players.stats(user, now)),
        ),
      ),
    };
  }

  /** getStats */
  @Get(':userId/stats')
  async get(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('userId') userId: string,
  ): Promise<StatsBody> {
    const [user] = await this.players.visible(caller, [userId]);
    return toStatsBody(await this.players.stats(user, new Date()));
  }
}

function toStatsBody(stats: Stats): StatsBody {
  return {
    userId: stats.userId,
    xp: stats.xp,
    level: stats.level,
    levelXp: LevelCurve.xpFor(stats.level),
    nextLevelXp: LevelCurve.xpFor(stats.level + 1),
    volts: stats.volts,
    todaySeconds: stats.todaySeconds,
    todayAttended: stats.todayAttended,
    weekSeconds: stats.weekSeconds,
    week: stats.week.map((one) => ({
      day: one.day.toString(),
      studiedSeconds: one.studiedSeconds,
      goalMinutes: one.goalMinutes,
      goalMet: one.goalMet,
    })),
    attendanceStreak: stats.attendanceStreak,
    absenceStreak: stats.absenceStreak,
    dayNumber: stats.dayNumber,
  };
}
