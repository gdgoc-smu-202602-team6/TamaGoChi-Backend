import { rules } from '../../rules/rules.js';

/** The room's state (merged 7장): hearts, bugs and the progress against the next bug, and the two streaks. */
export class RoomCondition {
  constructor(
    readonly hearts: number,
    readonly bugs: number,
    /** Milliseconds studied against the next bug; whole seconds once a day is closed. */
    readonly bugProgressMs: number,
    readonly attendanceStreak: number,
    readonly absenceStreak: number,
  ) {}

  /** A new user's room: full hearts, no bugs (B-01). */
  static readonly initial = new RoomCondition(rules.maxHearts, 0, 0, 0, 0);

  get bugProgressSeconds(): number {
    return Math.floor(this.bugProgressMs / 1000);
  }
}
