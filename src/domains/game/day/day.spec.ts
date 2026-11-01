import { Day } from './day.js';

describe('Day', () => {
  it('한국 시간 오전 4시 정각부터 그날이다', () => {
    expect(Day.of(new Date('2026-11-01T19:00:00Z')).toString()).toBe(
      '2026-11-02',
    );
  });

  it('한국 시간 오전 3시 59분은 전날이다', () => {
    expect(Day.of(new Date('2026-11-01T18:59:59Z')).toString()).toBe(
      '2026-11-01',
    );
  });

  it('하루의 시작과 끝은 한국 시간 오전 4시다', () => {
    const day = Day.parse('2026-11-02');

    expect([day.start.toISOString(), day.end.toISOString()]).toEqual([
      '2026-11-01T19:00:00.000Z',
      '2026-11-02T19:00:00.000Z',
    ]);
  });

  it('그 주의 월요일을 준다', () => {
    expect(Day.parse('2026-11-01').monday.toString()).toBe('2026-10-26');
  });

  it('형식이 틀리면 실패한다', () => {
    expect(() => Day.parse('2026-1-1')).toThrow(RangeError);
  });
});
