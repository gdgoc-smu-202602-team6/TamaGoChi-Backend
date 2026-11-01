import { rules } from '../../rules/rules.js';
import type { StudySession } from '../study-sessions/study-session.js';
import type { Progress } from './progress.js';

/** What a user has earned (merged 6.3, 6.4, 8.2). Volts and XP are two counts; spending volts never lowers XP. */
export class Earnings {
  /** Whole minutes of the ended sessions: each pays its minutes once it ends. */
  static paidMinutes(sessions: readonly StudySession[], now: Date): number {
    return sessions
      .filter((session) => session.state(now) === 'ENDED')
      .reduce((sum, session) => sum + session.paidMinutes(now), 0);
  }

  /** 100 + the minutes paid − the prices paid. */
  static volts(paidMinutes: number, spent: number): number {
    return rules.startingVolts + paidMinutes - spent;
  }

  /** The minutes paid, with the bonus of each attended day and each day the goal was met. */
  static xp(
    paidMinutes: number,
    attendedDays: number,
    goalDays: number,
  ): number {
    return (
      paidMinutes +
      attendedDays * rules.attendanceBonusXp +
      goalDays * rules.goalBonusXp
    );
  }

  /** The XP earned by now: the minutes of the ended sessions, with the days `earned` attended and met the goal. */
  static earnedXp(
    sessions: readonly StudySession[],
    earned: Progress,
    now: Date,
  ): number {
    return Earnings.xp(
      Earnings.paidMinutes(sessions, now),
      earned.attendedDays,
      earned.goalDays,
    );
  }
}
