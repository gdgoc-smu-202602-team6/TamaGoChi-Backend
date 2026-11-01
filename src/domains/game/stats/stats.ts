import { Day } from '../day/day.js';
import { LevelCurve } from '../level/level-curve.js';
import { Earnings } from '../progress/earnings.js';
import type { Progress, ProgressRecords } from '../progress/progress.js';

/** One day of the week chart (M-04): the study, the goal of that day, and whether it was met. */
export interface DayStudy {
  readonly day: Day;
  readonly studiedSeconds: number;
  readonly goalMinutes: number;
  readonly goalMet: boolean;
}

/** A user's numbers now (H-02, H-20~H-22, M-02~M-04). Computed from the play, never stored. */
export class Stats {
  constructor(
    readonly userId: string,
    readonly xp: number,
    readonly volts: number,
    readonly todaySeconds: number,
    readonly todayAttended: boolean,
    readonly week: readonly DayStudy[],
    readonly attendanceStreak: number,
    readonly absenceStreak: number,
    /** The day the account was created is day 1 (H-21). */
    readonly dayNumber: number,
  ) {}

  /** `progress` is what is shown, `earned` what counts for XP (ProgressService). */
  static of(
    userId: string,
    records: ProgressRecords,
    progress: Progress,
    earned: Progress,
    spent: number,
    now: Date,
  ): Stats {
    const paid = Earnings.paidMinutes(records.sessions, now);
    const today = Day.of(now);
    const days = new Map(progress.days.map((one) => [one.day.index, one]));
    const week = Array.from({ length: 7 }, (_, offset): DayStudy => {
      const day = today.monday.plus(offset);
      const goalMinutes = records.goals.on(day).minutes;
      if (day.equals(today))
        return {
          day,
          studiedSeconds: progress.today.studiedSeconds,
          goalMinutes,
          goalMet: progress.today.goalMet,
        };
      const settled = days.get(day.index);
      return {
        day,
        studiedSeconds: settled?.studiedSeconds ?? 0,
        goalMinutes,
        goalMet: settled?.goalMet ?? false,
      };
    });
    return new Stats(
      userId,
      Earnings.xp(paid, earned.attendedDays, earned.goalDays),
      Earnings.volts(paid, spent),
      progress.today.studiedSeconds,
      progress.today.attended,
      week,
      progress.condition.attendanceStreak,
      progress.condition.absenceStreak,
      today.since(records.firstDay) + 1,
    );
  }

  get level(): number {
    return LevelCurve.levelOf(this.xp);
  }

  get weekSeconds(): number {
    return this.week.reduce((sum, one) => sum + one.studiedSeconds, 0);
  }
}
