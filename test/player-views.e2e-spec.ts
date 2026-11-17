import request from 'supertest';
import { insertClub, insertMember } from './club-fixtures.js';
import { itemByCode } from './game-fixtures.js';
import { as, type SignedInUser } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('player views', () => {
  const testApp = TestApp.setUp();
  const clubIds: string[] = [];

  let host: SignedInUser;
  let friend: SignedInUser;
  let stranger: SignedInUser;

  beforeAll(async () => {
    [host, friend, stranger] = await Promise.all([
      testApp.signUp(),
      testApp.signUp(),
      testApp.signUp(),
    ]);
    const club = await insertClub(testApp.database);
    clubIds.push(club.clubId);
    await insertMember(testApp.database, club, host.email, 'member');
    await insertMember(testApp.database, club, friend.email, 'member');
  });

  afterAll(async () => {
    await testApp.database.club.deleteMany({ where: { id: { in: clubIds } } });
  });

  it('같은 동아리 부원의 방·통계는 보이고, 아니면 404다', async () => {
    const seen = await request(testApp.server())
      .get(`/users/${host.id}/room`)
      .set(as(friend));
    const batch = await request(testApp.server())
      .get(`/users/-/stats:batchGet?userIds=${host.id},${friend.id}`)
      .set(as(friend));
    const hidden = await request(testApp.server())
      .get(`/users/${host.id}/stats`)
      .set(as(stranger));

    expect(seen.status).toBe(200);
    expect(seen.body.newGuestbookCount).toBeUndefined();
    expect(
      batch.body.items.map((one: { userId: string }) => one.userId),
    ).toEqual([host.id, friend.id]);
    expect(hidden.status).toBe(404);
  });

  it('친구 방을 읽을 때 장착한 캐릭터가 들어 있다', async () => {
    const robot = await itemByCode(testApp.database, 'robot');

    const response = await request(testApp.server())
      .get(`/users/-/room:batchGet?userIds=${host.id}`)
      .set(as(friend));

    expect(response.body.items[0].equipped).toContainEqual({
      slot: 'CHARACTER',
      itemId: robot.id,
    });
  });
});
