import { StudySession } from './study-session.js';

const hour = 60 * 60 * 1000;
const start = new Date('2026-11-01T01:00:00Z');
const at = (hours: number) => new Date(start.getTime() + hours * hour);

describe('StudySession', () => {
  const running = new StudySession('s', 'u', start, null);

  it('12시간 전까지는 RUNNING, 12시간이 되면 ENDED다', () => {
    expect([running.state(at(11.9)), running.state(at(12))]).toEqual([
      'RUNNING',
      'ENDED',
    ]);
  });

  it('기기 시각이 시작 뒤이고 도착보다 이르면 그 시각에 끝난다', () => {
    expect(running.endTimeFor(at(2), at(1))).toEqual(at(1));
  });

  it('기기 시각이 시작 전이면 도착 시각에 끝난다', () => {
    expect(running.endTimeFor(at(2), at(-1))).toEqual(at(2));
  });

  it('12시간이 지난 뒤에는 기기 시각과 상관없이 12시간 시각에 끝난다', () => {
    expect(running.endTimeFor(at(13), at(1))).toEqual(at(12));
  });
});
