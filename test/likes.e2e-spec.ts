import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertClub, insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('likes', () => {
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

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
    [host, friend] = await Promise.all([signUp(), signUp()]);
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

  it('좋아요는 한 번만 세고, 내 방에는 400이다', async () => {
    await request(server()).put(`/users/${host.id}/likes/me`).set(as(friend));
    await request(server()).put(`/users/${host.id}/likes/me`).set(as(friend));
    const own = await request(server())
      .put(`/users/${friend.id}/likes/me`)
      .set(as(friend));

    const room = await request(server())
      .get(`/users/${host.id}/room`)
      .set(as(friend));

    expect(own.status).toBe(400);
    expect(room.body).toMatchObject({ likeCount: 1, likedByMe: true });
  });
});
