import { Injectable } from '@nestjs/common';
import { DailyGoalRepository } from '../daily-goal/daily-goal.repository.js';
import { Day } from '../day/day.js';
import { StudySessionRepository } from '../study-session/study-session.repository.js';
import { DaySettlementRepository } from './day-settlement.repository.js';
import { Progress, type ProgressRecords } from './progress.js';

/** A user's play now, and the records it came from. */
export interface PlayNow {
  readonly records: ProgressRecords;
  /** What is shown: the running session's time counts (B-02). */
  readonly progress: Progress;
  /** What is earned: only ended sessions count, so a running session ended earlier never takes XP back (F-36). */
  readonly earned: Progress;
}

/**
 * Settles on read (api.md 1절): the play is computed from the records whenever it is read, and the days that closed
 * since the last read are confirmed then, up to the day a running session started. Nothing runs at a set time, and a
 * day nobody looked at is still settled.
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly sessions: StudySessionRepository,
    private readonly goals: DailyGoalRepository,
    private readonly settlements: DaySettlementRepository,
  ) {}

  /**
   * `accountCreatedAt` starts the play: that day is the first day. `joinedAt` are the moments the user joined clubs
   * (B-16: those days have no absence penalty).
   */
  private async records(
    userId: string,
    accountCreatedAt: Date,
    joinedAt: readonly Date[],
  ): Promise<ProgressRecords> {
    const [sessions, goals, settlements] = await Promise.all([
      this.sessions.all(userId),
      this.goals.history(userId),
      this.settlements.all(userId),
    ]);
    return {
      firstDay: Day.of(accountCreatedAt),
      sessions,
      goals,
      joinDays: new Set(joinedAt.map((moment) => Day.of(moment).index)),
      settlements,
    };
  }

  async now(
    userId: string,
    accountCreatedAt: Date,
    joinedAt: readonly Date[],
    now: Date,
  ): Promise<PlayNow> {
    const records = await this.records(userId, accountCreatedAt, joinedAt);
    const progress = Progress.at(records, now);
    const running = records.sessions.find(
      (session) => session.state(now) === 'RUNNING',
    );
    if (!running) {
      await this.settlements.confirm(userId, progress.closed);
      return { records, progress, earned: progress };
    }
    // The running session may still end earlier than now (clientEndedAt), so the days from its start stay open.
    const runningFrom = Day.of(running.startedAt);
    await this.settlements.confirm(
      userId,
      progress.closed.filter((one) => one.day.since(runningFrom) < 0),
    );
    const earned = Progress.at(
      {
        ...records,
        sessions: records.sessions.filter((one) => one !== running),
      },
      now,
    );
    return { records, progress, earned };
  }
}
