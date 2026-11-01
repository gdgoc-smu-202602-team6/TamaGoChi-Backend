import request from 'supertest';
import { minute, studied } from './game-fixtures.js';
import { as } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('stats', () => {
  const testApp = TestApp.setUp();

  it('새 사용자는 볼트 100, Lv.1, 이용 1일차다', async () => {
    const user = await testApp.signUp();

    const response = await request(testApp.server())
      .get('/users/me/stats')
      .set(as(user));

    expect(response.body).toMatchObject({
      volts: 100,
      xp: 0,
      level: 1,
      nextLevelXp: 100,
      dayNumber: 1,
    });
    expect(response.body.week).toHaveLength(7);
  });

  it('61분 공부하면 볼트 161, XP는 61분과 출석 보너스 10이다', async () => {
    const user = await testApp.signUp();
    await studied(testApp.database, user.id, 70, 61);

    const response = await request(testApp.server())
      .get('/users/me/stats')
      .set(as(user));

    expect(response.body).toMatchObject({
      volts: 161,
      xp: 71,
      todayAttended: true,
      todaySeconds: 61 * 60,
    });
  });

  it('진행 중인 세션은 출석 표시에는 들고 XP에는 들지 않는다', async () => {
    const user = await testApp.signUp();
    await testApp.database.userStudySession.create({
      data: {
        userId: user.id,
        startedAt: new Date(Date.now() - 40 * minute),
      },
    });

    const response = await request(testApp.server())
      .get('/users/me/stats')
      .set(as(user));

    expect(response.body).toMatchObject({
      todayAttended: true,
      xp: 0,
      volts: 100,
    });
  });
});
