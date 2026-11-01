import { Injectable } from '@nestjs/common';
import { LevelCurve } from '../../level/level-curve.js';
import { LevelRepository } from '../../level/level.repository.js';
import { OwnedItemRepository } from '../items/owned-item.repository.js';
import { Earnings } from '../progress/earnings.js';
import { ProgressService } from '../progress/progress.service.js';
import { Stats } from './stats.js';
import type { Id } from '../../../../foundation/id/id.js';

/** A user's stats now: the play, the volts spent and the highest level reached. */
@Injectable()
export class StatsService {
  constructor(
    private readonly progress: ProgressService,
    private readonly ownedItems: OwnedItemRepository,
    private readonly levels: LevelRepository,
  ) {}

  async of(
    userId: Id<'User'>,
    accountCreatedAt: Date,
    joinedAt: readonly Date[],
    now: Date,
  ): Promise<Stats> {
    const [play, spent] = await Promise.all([
      this.progress.now(userId, accountCreatedAt, joinedAt, now),
      this.ownedItems.spent(userId),
    ]);
    const xp = Earnings.earnedXp(play.records.sessions, play.earned, now);
    const reached = await this.levels.reach(userId, LevelCurve.levelOf(xp));
    return Stats.of(
      userId,
      play.records,
      play.progress,
      play.earned,
      spent,
      reached,
      now,
    );
  }
}
