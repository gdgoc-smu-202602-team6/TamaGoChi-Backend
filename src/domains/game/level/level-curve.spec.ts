import { LevelCurve } from './level-curve.js';

describe('LevelCurve', () => {
  it('레벨표의 누적 경험치와 같다', () => {
    expect([1, 2, 3, 10, 13].map((level) => LevelCurve.xpFor(level))).toEqual([
      0, 100, 250, 2700, 4500,
    ]);
  });

  it('99XP는 Lv.1, 100XP는 Lv.2다', () => {
    expect([LevelCurve.levelOf(99), LevelCurve.levelOf(100)]).toEqual([1, 2]);
  });

  it('한 번에 여러 레벨을 넘으면 그 레벨까지 오른다', () => {
    expect(LevelCurve.levelOf(700)).toBe(5);
  });
});
