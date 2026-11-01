import type { Day } from '../../day/day.js';
import { rules } from '../../rules/rules.js';
import { DaySettlement } from './day-settlement.js';
import { RoomCondition } from '../room/room-condition.js';

const attendanceMs = rules.attendanceSeconds * 1000;
const msPerBug = rules.secondsPerBug * 1000;

/**
 * One day being played (merged 7.1~7.3): study is added in time order, and each moment it crosses a line acts at
 * once. Attending gives the day's heart if no bugs are left (B-04), else when the last bug goes that day (B-05).
 * Only study while bugs are around clears them, and what is left after the last one is dropped (B-21, B-23).
 */
export class DayRun {
  private hearts: number;
  private bugs: number;
  private bugProgressMs: number;
  private attendanceStreak: number;
  private absenceStreak: number;
  private studiedMs = 0;
  private heartGiven = false;
  private heartPending = false;

  attended = false;
  goalMet = false;
  /** Bugs cleared in this run. */
  cleared = 0;

  constructor(
    readonly day: Day,
    start: RoomCondition,
    private readonly goalMinutes: number,
    /** The day an application of the user was approved: no absence penalty (B-16). */
    private readonly joinDay: boolean,
  ) {
    this.hearts = start.hearts;
    this.bugs = start.bugs;
    this.bugProgressMs = start.bugProgressMs;
    this.attendanceStreak = start.attendanceStreak;
    this.absenceStreak = start.absenceStreak;
  }

  study(ms: number): void {
    let left = ms;
    while (left > 0) {
      let step = left;
      if (!this.attended) step = Math.min(step, attendanceMs - this.studiedMs);
      if (this.bugs > 0) step = Math.min(step, msPerBug - this.bugProgressMs);
      this.studiedMs += step;
      left -= step;
      if (this.bugs > 0) this.clear(step);
      if (!this.attended && this.studiedMs >= attendanceMs) this.attend();
    }
    if (this.studiedMs >= this.goalMinutes * 60 * 1000) this.goalMet = true;
  }

  get studiedSeconds(): number {
    return Math.floor(this.studiedMs / 1000);
  }

  /** The room's state so far. */
  get condition(): RoomCondition {
    return new RoomCondition(
      this.hearts,
      this.bugs,
      this.bugProgressMs,
      this.attendanceStreak,
      this.absenceStreak,
    );
  }

  /**
   * The day is over: an absence costs a heart and grows the absence streak, and enough absences bring bugs (B-10,
   * B-12, B-13). Bug progress is kept in whole seconds, as the stored settlement keeps it.
   */
  close(): DaySettlement {
    if (!this.attended && !this.joinDay) {
      this.hearts = Math.max(0, this.hearts - 1);
      this.absenceStreak += 1;
      this.attendanceStreak = 0;
      if (this.absenceStreak >= rules.absenceDaysForBugs && this.bugs === 0) {
        this.bugs = rules.bugsPerOutbreak;
        this.bugProgressMs = 0;
      }
    }
    this.bugProgressMs = Math.floor(this.bugProgressMs / 1000) * 1000;
    return new DaySettlement(
      this.day,
      this.studiedSeconds,
      this.attended,
      this.goalMet,
      this.condition,
    );
  }

  /** Study against the bugs; every hour of it clears one (B-21). */
  private clear(ms: number): void {
    this.bugProgressMs += ms;
    if (this.bugProgressMs < msPerBug) return;
    this.bugs -= 1;
    this.cleared += 1;
    this.bugProgressMs = 0;
    if (this.bugs === 0 && this.heartPending) this.giveHeart();
  }

  private attend(): void {
    this.attended = true;
    this.attendanceStreak += 1;
    this.absenceStreak = 0;
    if (this.bugs === 0) this.giveHeart();
    else this.heartPending = true;
  }

  private giveHeart(): void {
    if (this.heartGiven) return;
    this.heartGiven = true;
    this.heartPending = false;
    this.hearts = Math.min(rules.maxHearts, this.hearts + 1);
  }
}
