import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertClub, insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('guestbookEntries', () => {
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
  let clubId: string;
  let hostMemberId: string;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
    [host, friend, stranger] = await Promise.all([
      signUp(),
      signUp(),
      signUp(),
    ]);
    const club = await insertClub(database);
    clubId = club.clubId;
    clubIds.push(clubId);
    hostMemberId = await insertMember(database, club, host.email, 'member');
    await insertMember(database, club, friend.email, 'member');
  });

  afterAll(async () => {
    await database.club.deleteMany({ where: { id: { in: clubIds } } });
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('방명록은 쓰면 201, 내 방에는 400, 주인에게는 새 글로 보인다', async () => {
    const path = `/clubs/${clubId}/members/${hostMemberId}/guestbookEntries`;

    const written = await request(server())
      .post(path)
      .set(as(friend))
      .send({ body: '  놀러 왔어요  ' });
    const own = await request(server())
      .post(`/clubs/${clubId}/members/me/guestbookEntries`)
      .set(as(friend))
      .send({ body: '내 방' });
    const blank = await request(server())
      .post(path)
      .set(as(friend))
      .send({ body: '   ' });
    const mine = await request(server())
      .get('/users/me/guestbookEntries')
      .set(as(host));

    expect([written.status, own.status, blank.status]).toEqual([201, 400, 400]);
    expect(written.body).toMatchObject({
      body: '놀러 왔어요',
      authorUserId: friend.id,
      clubId,
    });
    expect(mine.body.items[0]).toMatchObject({
      id: written.body.id,
      new: true,
    });
  });

  it('방명록은 쓴 사람이나 주인만 지우고, 남은 403이다', async () => {
    const path = `/clubs/${clubId}/members/${hostMemberId}/guestbookEntries`;
    const written = await request(server())
      .post(path)
      .set(as(friend))
      .send({ body: '안녕' });
    const club = {
      clubId,
      partId: (await database.clubPart.findFirstOrThrow({ where: { clubId } }))
        .id,
    };
    await insertMember(database, club, stranger.email, 'member');

    const byStranger = await request(server())
      .delete(`${path}/${written.body.id}`)
      .set(as(stranger));
    const byHost = await request(server())
      .delete(`${path}/${written.body.id}`)
      .set(as(host));

    expect([byStranger.status, byHost.status]).toEqual([403, 204]);
  });
});
