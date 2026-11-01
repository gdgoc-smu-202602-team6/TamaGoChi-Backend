import request from 'supertest';
import { insertClub, insertMember } from './club-fixtures.js';
import { as, type SignedInUser } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('likes', () => {
  const testApp = TestApp.setUp();
  const clubIds: string[] = [];

  let host: SignedInUser;
  let friend: SignedInUser;

  beforeAll(async () => {
    [host, friend] = await Promise.all([testApp.signUp(), testApp.signUp()]);
    const club = await insertClub(testApp.database);
    clubIds.push(club.clubId);
    await insertMember(testApp.database, club, host.email, 'member');
    await insertMember(testApp.database, club, friend.email, 'member');
  });

  afterAll(async () => {
    await testApp.database.club.deleteMany({ where: { id: { in: clubIds } } });
  });

  it('좋아요는 한 번만 세고, 내 방에는 400이다', async () => {
    await request(testApp.server())
      .put(`/users/${host.id}/likes/me`)
      .set(as(friend));
    await request(testApp.server())
      .put(`/users/${host.id}/likes/me`)
      .set(as(friend));
    const own = await request(testApp.server())
      .put(`/users/${friend.id}/likes/me`)
      .set(as(friend));

    const room = await request(testApp.server())
      .get(`/users/${host.id}/room`)
      .set(as(friend));

    expect(own.status).toBe(400);
    expect(room.body).toMatchObject({ likeCount: 1, likedByMe: true });
  });
});
