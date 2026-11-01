import request from 'supertest';
import { Day } from '../src/domains/game/day/day.js';
import { insertClub } from './club-fixtures.js';
import { minute } from './game-fixtures.js';
import { as } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('progress', () => {
  const testApp = TestApp.setUp();
  const clubIds: string[] = [];

  afterAll(async () => {
    await testApp.database.club.deleteMany({ where: { id: { in: clubIds } } });
  });

  it('승인된 날은 공부하지 않아도 하트가 줄지 않고, 동아리를 나가도 그렇다', async () => {
    const user = await testApp.signUp();
    const yesterday = Day.of(new Date()).plus(-1).start;
    await testApp.database.user.update({
      where: { id: user.id },
      data: { createdAt: new Date(yesterday.getTime() + minute) },
    });
    const club = await insertClub(testApp.database);
    clubIds.push(club.clubId);
    await testApp.database.clubApplication.create({
      data: {
        clubId: club.clubId,
        userId: user.id,
        partId: club.partId,
        state: 'APPROVED',
        decidedAt: new Date(yesterday.getTime() + 2 * minute),
      },
    });

    const room = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));
    const stats = await request(testApp.server())
      .get('/users/me/stats')
      .set(as(user));

    expect(room.body.condition.hearts).toBe(4);
    expect(stats.body.absenceStreak).toBe(0);
  });

  it('5일 전에 만든 계정이 공부하지 않았으면 하트 0, 버그 3이고 지난 날들이 확정된다', async () => {
    const user = await testApp.signUp();
    const fiveDaysAgo = Day.of(new Date()).plus(-5).start;
    await testApp.database.user.update({
      where: { id: user.id },
      data: { createdAt: new Date(fiveDaysAgo.getTime() + minute) },
    });

    const stats = await request(testApp.server())
      .get('/users/me/stats')
      .set(as(user));
    const room = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));
    const confirmed = await testApp.database.userDaySettlement.count({
      where: { userId: user.id },
    });

    expect(stats.body).toMatchObject({ dayNumber: 6, absenceStreak: 5 });
    expect(room.body.condition).toMatchObject({ hearts: 0, bugs: 3 });
    expect(confirmed).toBe(5);
  });
});
