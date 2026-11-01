import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { minute, studied } from './game-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('stats', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  const emails: string[] = [];
  const server = () => app.getHttpServer();
  const as = (user: SignedInUser) => ({
    Authorization: `Bearer ${user.token}`,
  });

  const signUp = async (): Promise<SignedInUser & { id: string }> => {
    const user = await signUpVerifiedUser(app, mailer);
    emails.push(user.email);
    const row = await database.user.findUniqueOrThrow({
      where: { email: user.email },
    });
    return { ...user, id: row.id };
  };

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
  });

  afterAll(async () => {
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('새 사용자는 볼트 100, Lv.1, 이용 1일차다', async () => {
    const user = await signUp();

    const response = await request(server())
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
    const user = await signUp();
    await studied(database, user.id, 70, 61);

    const response = await request(server())
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
    const user = await signUp();
    await database.userStudySession.create({
      data: {
        userId: user.id,
        startedAt: new Date(Date.now() - 40 * minute),
      },
    });

    const response = await request(server())
      .get('/users/me/stats')
      .set(as(user));

    expect(response.body).toMatchObject({
      todayAttended: true,
      xp: 0,
      volts: 100,
    });
  });
});
