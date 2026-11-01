import type { DailyGoalHistory } from '../daily-goal/daily-goal.js';
import { Day } from '../day/day.js';
import type { StudySession } from '../study-session/study-session.js';
import { DayRun } from './day-run.js';
import type { DaySettlement } from './day-settlement.js';
import { RoomCondition } from './room-condition.js';

/** What the play of a user is computed from: nothing else, so any moment gives the same result every time. */
export interface ProgressRecords {
  /** The day the account was created: the first day played. */
  readonly firstDay: Day;
  readonly sessions: readonly StudySession[];
  readonly goals: DailyGoalHistory;
  /** Day indexes on which an application of the user was approved. */
  readonly joinDays: ReadonlySet<number>;
  /** Days already confirmed, oldest first. */
  readonly settlements: readonly DaySettlement[];
}

/**
 * The play of a user up to one moment: the days that closed before it and the day it falls in, played from the
 * last confirmed day before that day (or from the first day).
 */
export class Progress {
  private constructor(
    /** Confirmed days before the computed ones. */
    readonly confirmed: readonly DaySettlement[],
    /** Days computed here that closed before the moment. */
    readonly closed: readonly DaySettlement[],
    /** The day the moment falls in, played up to it. */
    readonly today: DayRun,
    /** Bugs cleared in the computed days. */
    readonly cleared: number,
  ) {}

  /**
   * `playFrom` makes the computation start no later than that day, so two moments computed with the same `playFrom`
   * count `cleared` from the same point.
   */
  static at(
    records: ProgressRecords,
    moment: Date,
    playFrom: Day = Day.of(moment),
  ): Progress {
    const target = Day.of(moment);
    const confirmed = records.settlements.filter(
      (one) => one.day.since(playFrom) < 0,
    );
    const base = confirmed.at(-1);
    let day = base ? base.day.plus(1) : records.firstDay;
    let condition = base ? base.condition : RoomCondition.initial;
    const closed: DaySettlement[] = [];
    let cleared = 0;
    for (;;) {
      const run = new DayRun(
        day,
        condition,
        records.goals.on(day).minutes,
        records.joinDays.has(day.index),
      );
      for (const session of records.sessions) {
        const span = session.spanOn(day, moment);
        if (span) run.study(span.to - span.from);
      }
      if (day.since(target) >= 0)
        return new Progress(confirmed, closed, run, cleared + run.cleared);
      const settlement = run.close();
      cleared += run.cleared;
      closed.push(settlement);
      condition = settlement.condition;
      day = day.plus(1);
    }
  }

  /** The room's state at the moment. */
  get condition(): RoomCondition {
    return this.today.condition;
  }

  /** Every closed day: the confirmed ones and those computed here. */
  get days(): readonly DaySettlement[] {
    return [...this.confirmed, ...this.closed];
  }

  /** Days attended so far, the day of the moment included. */
  get attendedDays(): number {
    return (
      this.days.filter((one) => one.attended).length +
      (this.today.attended ? 1 : 0)
    );
  }

  /** Days whose goal was met so far, the day of the moment included. */
  get goalDays(): number {
    return (
      this.days.filter((one) => one.goalMet).length +
      (this.today.goalMet ? 1 : 0)
    );
  }
}
