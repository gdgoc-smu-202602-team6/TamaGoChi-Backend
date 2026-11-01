import { Day } from '../../day/day.js';
import { LevelCurve } from '../../level/level-curve.js';
import type { StudySession } from '../study-sessions/study-session.js';
import { Earnings } from './earnings.js';
import { Progress, type ProgressRecords } from './progress.js';

/**
 * What one ended session brought (F-24, F-25): the play at its end against the play at its start, both computed from
 * the records, so it reads the same every time (F-37).
 */
export class SessionResult {
  constructor(
    readonly studiedMinutes: number,
    readonly volts: number,
    readonly xp: number,
    readonly attendanceBonusXp: number,
    readonly goalBonusXp: number,
    readonly attendedNow: boolean,
    readonly bugsCleared: number,
    readonly bugsRemaining: number,
    readonly heartsChange: number,
    readonly levelBefore: number,
    readonly levelAfter: number,
  ) {}

  static of(
    records: ProgressRecords,
    session: StudySession,
    now: Date,
  ): SessionResult {
    const from = Day.of(session.startedAt);
    const before = Progress.at(records, session.startedAt, from);
    const after = Progress.at(records, session.effectiveEnd(now), from);
    const minutes = session.paidMinutes(now);
    const paidBefore = Earnings.paidMinutes(
      records.sessions.filter(
        (one) =>
          one.id !== session.id && one.effectiveEnd(now) <= session.startedAt,
      ),
      now,
    );
    const attended = after.attendedDays - before.attendedDays;
    const goals = after.goalDays - before.goalDays;
    const xpBefore = Earnings.xp(
      paidBefore,
      before.attendedDays,
      before.goalDays,
    );
    const xpAfter = Earnings.xp(
      paidBefore + minutes,
      after.attendedDays,
      after.goalDays,
    );
    return new SessionResult(
      minutes,
      minutes,
      minutes,
      Earnings.xp(0, attended, 0),
      Earnings.xp(0, 0, goals),
      attended > 0,
      after.cleared - before.cleared,
      after.condition.bugs,
      after.condition.hearts - before.condition.hearts,
      LevelCurve.levelOf(xpBefore),
      LevelCurve.levelOf(xpAfter),
    );
  }
}
