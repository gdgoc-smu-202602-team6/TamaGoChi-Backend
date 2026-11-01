import { Injectable } from '@nestjs/common';
import { ItemRepository } from '../item/item.repository.js';
import { LevelCurve } from '../level/level-curve.js';
import { LevelRepository } from '../level/level.repository.js';
import { Earnings } from '../progress/earnings.js';
import { ProgressService } from '../progress/progress.service.js';
import { Stats } from './stats.js';

/** A user's stats now: the play, the volts spent and the highest level reached. */
@Injectable()
export class StatsService {
  constructor(
    private readonly progress: ProgressService,
    private readonly items: ItemRepository,
    private readonly levels: LevelRepository,
  ) {}

  async of(userId: string, accountCreatedAt: Date, now: Date): Promise<Stats> {
    const [play, spent] = await Promise.all([
      this.progress.now(userId, accountCreatedAt, now),
      this.items.spent(userId),
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
