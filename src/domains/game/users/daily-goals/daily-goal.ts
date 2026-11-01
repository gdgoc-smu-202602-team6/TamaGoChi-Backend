import type { Day } from '../../day/day.js';
import { rules } from '../../rules/rules.js';

/** One version of a user's daily goal, in effect from `startOn` (M-11). A null `startOn` is the default goal. */
export class DailyGoal {
  constructor(
    readonly startOn: Day | null,
    readonly minutes: number,
  ) {}

  static readonly default = new DailyGoal(null, rules.defaultGoalMinutes);

  /** A new version takes effect from tomorrow at the earliest, so a goal met today cannot be raised away. */
  static canStartOn(startOn: Day, today: Day): boolean {
    return startOn.since(today) >= 1;
  }
}
