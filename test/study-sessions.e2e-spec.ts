import request from 'supertest';
import { minute } from './game-fixtures.js';
import { as } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('studySessions', () => {
  const testApp = TestApp.setUp();

  it('시작하면 201, 진행 중에 또 시작하면 409 session-running이다', async () => {
    const user = await testApp.signUp();

    const first = await request(testApp.server())
      .post('/users/me/studySessions')
      .set(as(user));
    const second = await request(testApp.server())
      .post('/users/me/studySessions')
      .set(as(user));

    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ state: 'RUNNING', studiedSeconds: 0 });
    expect(JSON.parse(second.text).type).toBe('/problems/session-running');
  });

  it('끝내면 결과를 주고, 다시 읽어도 같고, 다시 끝내면 409 session-ended다', async () => {
    const user = await testApp.signUp();
    const session = await testApp.database.userStudySession.create({
      data: {
        userId: user.id,
        startedAt: new Date(Date.now() - 31 * minute),
      },
    });

    const ended = await request(testApp.server())
      .patch(`/users/me/studySessions/${session.id}`)
      .set(as(user))
      .send({ state: 'ENDED' });
    const again = await request(testApp.server())
      .get(`/users/me/studySessions/${session.id}`)
      .set(as(user));
    const twice = await request(testApp.server())
      .patch(`/users/me/studySessions/${session.id}`)
      .set(as(user))
      .send({ state: 'ENDED' });

    expect(ended.body.result).toMatchObject({
      studiedMinutes: 31,
      volts: 31,
      attendanceBonusXp: 10,
      attendedNow: true,
      heartsChange: 0,
    });
    expect(again.body.result).toEqual(ended.body.result);
    expect(JSON.parse(twice.text).type).toBe('/problems/session-ended');
  });

  it('기기 시각이 시작 뒤이고 도착보다 이르면 그 시각으로 끝낸다', async () => {
    const user = await testApp.signUp();
    const session = await testApp.database.userStudySession.create({
      data: {
        userId: user.id,
        startedAt: new Date(Date.now() - 50 * minute),
      },
    });
    const clientEndedAt = new Date(Date.now() - 20 * minute).toISOString();

    const response = await request(testApp.server())
      .patch(`/users/me/studySessions/${session.id}`)
      .set(as(user))
      .send({ state: 'ENDED', clientEndedAt });

    expect(response.body.endedAt).toBe(clientEndedAt);
    expect(response.body.result.studiedMinutes).toBe(30);
  });

  it('12시간을 넘겨 남은 세션은 12시간에 끝난 것으로 보고 새로 시작할 수 있다', async () => {
    const user = await testApp.signUp();
    const old = await testApp.database.userStudySession.create({
      data: {
        userId: user.id,
        startedAt: new Date(Date.now() - 13 * 60 * minute),
      },
    });

    const started = await request(testApp.server())
      .post('/users/me/studySessions')
      .set(as(user));
    const closed = await testApp.database.userStudySession.findUniqueOrThrow({
      where: { id: old.id },
    });

    expect(started.status).toBe(201);
    expect(closed.endedAt!.getTime() - closed.startedAt.getTime()).toBe(
      12 * 60 * minute,
    );
  });
});
