/** The XP a level needs in total: 25·(L−1)·(L+2) (merged 6.4). Levels are not stored; they come from XP. */
export class LevelCurve {
  /** The total XP that reaches `level`. */
  static xpFor(level: number): number {
    return 25 * (level - 1) * (level + 2);
  }

  /** The highest level `xp` reaches. */
  static levelOf(xp: number): number {
    let level = 1;
    while (LevelCurve.xpFor(level + 1) <= xp) level += 1;
    return level;
  }
}
