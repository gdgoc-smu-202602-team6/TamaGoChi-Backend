/**
 * The fixed game values, the same for every user (merged 7.0, 6.4, 8.2, M-11). Code, not data: changing one changes
 * how the game plays (object.md 0.2).
 */
export const rules = Object.freeze({
  /** A day with at least this much study is attended. */
  attendanceSeconds: 30 * 60,
  /** This many absences in a row bring bugs when there are none. */
  absenceDaysForBugs: 4,
  /** Study while bugs are around that clears one bug. */
  secondsPerBug: 60 * 60,
  /** How many bugs come at once. */
  bugsPerOutbreak: 3,
  maxHearts: 4,
  /** A session counts at most this long. */
  maxSessionSeconds: 12 * 60 * 60,
  /** The daily goal of a day with no goal set. */
  defaultGoalMinutes: 180,
  startingVolts: 100,
  attendanceBonusXp: 10,
  goalBonusXp: 20,
});
