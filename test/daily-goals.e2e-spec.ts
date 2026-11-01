import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Day } from '../src/domains/game/day/day.js';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('dailyGoals', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  const emails: string[] = [];
  const server = () => app.getHttpServer();
  const as = (user: SignedInUser) => ({
    Authorization: `Bearer ${user.token}`,
  });

  const signUp = async (): Promise<SignedInUser> => {
    const user = await signUpVerifiedUser(app, mailer);
    emails.push(user.email);
    return user;
  };

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
  });

  afterAll(async () => {
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('내일부터의 목표는 201, 오늘부터는 400, 같은 적용일은 409다', async () => {
    const user = await signUp();
    const today = Day.of(new Date());

    const ok = await request(server())
      .post('/users/me/dailyGoals')
      .set(as(user))
      .send({ startOn: today.plus(1).toString(), minutes: 120 });
    const todayStart = await request(server())
      .post('/users/me/dailyGoals')
      .set(as(user))
      .send({ startOn: today.toString(), minutes: 120 });
    const duplicate = await request(server())
      .post('/users/me/dailyGoals')
      .set(as(user))
      .send({ startOn: today.plus(1).toString(), minutes: 60 });

    expect([ok.status, todayStart.status, duplicate.status]).toEqual([
      201, 400, 409,
    ]);
    const created = await request(server())
      .get(ok.headers.location)
      .set(as(user));
    expect(created.body).toEqual({
      startOn: today.plus(1).toString(),
      minutes: 120,
    });
    expect(JSON.parse(duplicate.text).type).toBe(
      '/problems/duplicate-start-on',
    );
  });

  it('버전이 없는 날의 목표는 180분 기본값이다', async () => {
    const user = await signUp();

    const response = await request(server())
      .get(`/users/me/dailyGoals?on=${Day.of(new Date()).toString()}`)
      .set(as(user));

    expect(response.body.items).toEqual([{ startOn: null, minutes: 180 }]);
  });
});
