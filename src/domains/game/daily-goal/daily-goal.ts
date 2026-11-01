import type { Day } from '../day/day.js';
import { rules } from '../rules/rules.js';

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

/** All versions of a user's goal. The goal of a day is the latest version that started on or before it. */
export class DailyGoalHistory {
  private readonly versions: readonly DailyGoal[];

  constructor(versions: readonly DailyGoal[]) {
    this.versions = [...versions].sort(
      (a, b) => (a.startOn?.index ?? 0) - (b.startOn?.index ?? 0),
    );
  }

  on(day: Day): DailyGoal {
    let found = DailyGoal.default;
    for (const version of this.versions) {
      if (version.startOn && version.startOn.since(day) <= 0) found = version;
    }
    return found;
  }

  get all(): readonly DailyGoal[] {
    return this.versions;
  }
}
