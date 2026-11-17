import request from 'supertest';
import { insertClub, insertMember } from './club-fixtures.js';
import { as, type SignedInUser } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('guestbookEntries', () => {
  const testApp = TestApp.setUp();
  const clubIds: string[] = [];

  let host: SignedInUser;
  let friend: SignedInUser;
  let stranger: SignedInUser;
  let clubId: string;
  let hostMemberId: string;

  beforeAll(async () => {
    [host, friend, stranger] = await Promise.all([
      testApp.signUp(),
      testApp.signUp(),
      testApp.signUp(),
    ]);
    const club = await insertClub(testApp.database);
    clubId = club.clubId;
    clubIds.push(clubId);
    hostMemberId = await insertMember(
      testApp.database,
      club,
      host.email,
      'member',
    );
    await insertMember(testApp.database, club, friend.email, 'member');
  });

  afterAll(async () => {
    await testApp.database.club.deleteMany({ where: { id: { in: clubIds } } });
  });

  it('방명록은 쓰면 201, 내 방에는 400, 소유자에게는 새 글로 보인다', async () => {
    const path = `/clubs/${clubId}/members/${hostMemberId}/guestbookEntries`;

    const written = await request(testApp.server())
      .post(path)
      .set(as(friend))
      .send({ body: '  놀러 왔어요  ' });
    const own = await request(testApp.server())
      .post(`/clubs/${clubId}/members/me/guestbookEntries`)
      .set(as(friend))
      .send({ body: '내 방' });
    const blank = await request(testApp.server())
      .post(path)
      .set(as(friend))
      .send({ body: '   ' });
    const mine = await request(testApp.server())
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

  it('방명록은 쓴 사람이나 소유자만 지우고, 남은 403이다', async () => {
    const path = `/clubs/${clubId}/members/${hostMemberId}/guestbookEntries`;
    const written = await request(testApp.server())
      .post(path)
      .set(as(friend))
      .send({ body: '안녕' });
    const club = {
      clubId,
      partId: (
        await testApp.database.clubPart.findFirstOrThrow({ where: { clubId } })
      ).id,
    };
    await insertMember(testApp.database, club, stranger.email, 'member');

    const byStranger = await request(testApp.server())
      .delete(`${path}/${written.body.id}`)
      .set(as(stranger));
    const byHost = await request(testApp.server())
      .delete(`${path}/${written.body.id}`)
      .set(as(host));

    expect([byStranger.status, byHost.status]).toEqual([403, 204]);
  });
});
