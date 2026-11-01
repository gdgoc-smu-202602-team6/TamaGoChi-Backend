import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Day } from '../src/domains/game/day/day.js';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertClub } from './club-fixtures.js';
import { minute } from './game-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('progress', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  const emails: string[] = [];
  const clubIds: string[] = [];
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
    await database.club.deleteMany({ where: { id: { in: clubIds } } });
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('승인된 날은 공부하지 않아도 하트가 줄지 않고, 동아리를 나가도 그렇다', async () => {
    const user = await signUp();
    const yesterday = Day.of(new Date()).plus(-1).start;
    await database.user.update({
      where: { id: user.id },
      data: { createdAt: new Date(yesterday.getTime() + minute) },
    });
    const club = await insertClub(database);
    clubIds.push(club.clubId);
    await database.clubApplication.create({
      data: {
        clubId: club.clubId,
        userId: user.id,
        partId: club.partId,
        state: 'APPROVED',
        decidedAt: new Date(yesterday.getTime() + 2 * minute),
      },
    });

    const room = await request(server()).get('/users/me/room').set(as(user));
    const stats = await request(server()).get('/users/me/stats').set(as(user));

    expect(room.body.condition.hearts).toBe(4);
    expect(stats.body.absenceStreak).toBe(0);
  });

  it('5일 전에 만든 계정이 공부하지 않았으면 하트 0, 버그 3이고 지난 날들이 확정된다', async () => {
    const user = await signUp();
    const fiveDaysAgo = Day.of(new Date()).plus(-5).start;
    await database.user.update({
      where: { id: user.id },
      data: { createdAt: new Date(fiveDaysAgo.getTime() + minute) },
    });

    const stats = await request(server()).get('/users/me/stats').set(as(user));
    const room = await request(server()).get('/users/me/room').set(as(user));
    const confirmed = await database.userDaySettlement.count({
      where: { userId: user.id },
    });

    expect(stats.body).toMatchObject({ dayNumber: 6, absenceStreak: 5 });
    expect(room.body.condition).toMatchObject({ hearts: 0, bugs: 3 });
    expect(confirmed).toBe(5);
  });
});
