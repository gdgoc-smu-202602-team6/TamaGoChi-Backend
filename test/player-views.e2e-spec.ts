import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertClub, insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('player views', () => {
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

  let host: SignedInUser & { id: string };
  let friend: SignedInUser & { id: string };
  let stranger: SignedInUser & { id: string };

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
    [host, friend, stranger] = await Promise.all([
      signUp(),
      signUp(),
      signUp(),
    ]);
    const club = await insertClub(database);
    clubIds.push(club.clubId);
    await insertMember(database, club, host.email, 'member');
    await insertMember(database, club, friend.email, 'member');
  });

  afterAll(async () => {
    await database.club.deleteMany({ where: { id: { in: clubIds } } });
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('같은 동아리 부원의 방·통계는 보이고, 아니면 404다', async () => {
    const seen = await request(server())
      .get(`/users/${host.id}/room`)
      .set(as(friend));
    const batch = await request(server())
      .get(`/users/-/stats:batchGet?userIds=${host.id},${friend.id}`)
      .set(as(friend));
    const hidden = await request(server())
      .get(`/users/${host.id}/stats`)
      .set(as(stranger));

    expect(seen.status).toBe(200);
    expect(seen.body.newGuestbookCount).toBeUndefined();
    expect(
      batch.body.items.map((one: { userId: string }) => one.userId),
    ).toEqual([host.id, friend.id]);
    expect(hidden.status).toBe(404);
  });
});
