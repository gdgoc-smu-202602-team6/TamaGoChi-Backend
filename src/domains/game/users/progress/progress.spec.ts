import { asId } from '../../../../foundation/id/id.js';
import { DailyGoalHistory } from '../daily-goals/daily-goal-history.js';
import { Day } from '../../day/day.js';
import { StudySession } from '../study-sessions/study-session.js';
import { DaySettlement } from './day-settlement.js';
import { Progress, type ProgressRecords } from './progress.js';

const firstDay = Day.parse('2026-11-01');
const minutes = 60 * 1000;

/** A session that starts at 10:00 Korea time (6 hours into the day) on day `n` (1 = firstDay). */
function studyOn(n: number, length: number): StudySession {
  const startedAt = new Date(
    firstDay.plus(n - 1).start.getTime() + 6 * 60 * minutes,
  );
  return new StudySession(
    asId<'StudySession'>(`s${n}`),
    asId<'User'>('u'),
    startedAt,
    new Date(startedAt.getTime() + length * minutes),
  );
}

function records(
  sessions: StudySession[],
  extra: Partial<ProgressRecords> = {},
): ProgressRecords {
  return {
    firstDay,
    sessions,
    goals: new DailyGoalHistory([]),
    joinDays: new Set(),
    settlements: [],
    ...extra,
  };
}

/** The end of day `n`, just before the next day starts. */
const endOf = (n: number) => new Date(firstDay.plus(n - 1).end.getTime() - 1);

describe('Progress (merged 7.5)', () => {
  const sessions = [studyOn(1, 40), studyOn(6, 120), studyOn(7, 60)];

  it('1일차 40분이면 출석이고 하트는 4개 그대로다', () => {
    const progress = Progress.at(records(sessions), endOf(1));

    expect(progress.today.attended).toBe(true);
    expect(progress.condition.hearts).toBe(4);
  });

  it('2~5일차 0분이면 하트가 매일 줄고 5일차가 끝나면 버그 3마리가 생긴다', () => {
    const progress = Progress.at(records(sessions), firstDay.plus(5).start);

    expect(progress.condition).toMatchObject({
      hearts: 0,
      bugs: 3,
      absenceStreak: 4,
    });
  });

  it('6일차 2시간이면 출석하고 버그 2마리를 퇴치하지만 하트는 보류된다', () => {
    const progress = Progress.at(records(sessions), endOf(6));

    expect(progress.today.attended).toBe(true);
    expect(progress.condition).toMatchObject({ hearts: 0, bugs: 1 });
  });

  it('7일차 1시간이면 마지막 버그를 퇴치하고 하트 1개를 받는다', () => {
    const progress = Progress.at(records(sessions), endOf(7));

    expect(progress.condition).toMatchObject({
      hearts: 1,
      bugs: 0,
      bugProgressMs: 0,
      attendanceStreak: 2,
    });
  });

  it('확정된 날에서 이어 계산해도 처음부터 계산한 것과 같다', () => {
    const fromScratch = Progress.at(records(sessions), endOf(7));
    const confirmed = Progress.at(records(sessions), endOf(6)).closed;

    const resumed = Progress.at(
      records(sessions, { settlements: confirmed }),
      endOf(7),
    );

    expect(resumed.condition).toEqual(fromScratch.condition);
    expect(resumed.attendedDays).toBe(fromScratch.attendedDays);
  });
});

describe('Progress 경계', () => {
  it('29분 40초와 30초를 공부하면 하루 합 30분 10초라 출석이다', () => {
    const first = studyOn(1, 0);
    const a = new StudySession(
      asId<'StudySession'>('a'),
      asId<'User'>('u'),
      first.startedAt,
      new Date(first.startedAt.getTime() + (29 * 60 + 40) * 1000),
    );
    const b = new StudySession(
      asId<'StudySession'>('b'),
      asId<'User'>('u'),
      new Date(first.startedAt.getTime() + 60 * minutes),
      new Date(first.startedAt.getTime() + 60 * minutes + 30 * 1000),
    );

    const progress = Progress.at(records([a, b]), endOf(1));

    expect(progress.today.attended).toBe(true);
  });

  it('29분 59초면 출석이 아니고 그날이 끝나면 하트가 하나 줄어든다', () => {
    const progress = Progress.at(
      records([
        new StudySession(
          asId<'StudySession'>('a'),
          asId<'User'>('u'),
          studyOn(1, 0).startedAt,
          new Date(studyOn(1, 0).startedAt.getTime() + (30 * 60 - 1) * 1000),
        ),
      ]),
      firstDay.plus(1).start,
    );

    expect(progress.condition).toMatchObject({ hearts: 3, absenceStreak: 1 });
  });

  it('가입이 승인된 날은 공부하지 않아도 하트가 줄지 않는다', () => {
    const progress = Progress.at(
      records([], { joinDays: new Set([firstDay.index]) }),
      firstDay.plus(1).start,
    );

    expect(progress.condition).toMatchObject({ hearts: 4, absenceStreak: 0 });
  });

  it('오전 4시를 넘긴 세션은 두 날에 나눠 센다', () => {
    const start = new Date(firstDay.end.getTime() - 20 * minutes);
    const session = new StudySession(
      asId<'StudySession'>('s'),
      asId<'User'>('u'),
      start,
      new Date(start.getTime() + 40 * minutes),
    );

    const progress = Progress.at(records([session]), endOf(2));

    expect(progress.closed[0]).toBeInstanceOf(DaySettlement);
    expect(progress.closed[0].studiedSeconds).toBe(20 * 60);
    expect(progress.closed[0].attended).toBe(false);
    expect(progress.today.studiedSeconds).toBe(20 * 60);
  });
});
