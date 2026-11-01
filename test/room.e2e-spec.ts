import request from 'supertest';
import { itemByCode } from './game-fixtures.js';
import { as } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('room', () => {
  const testApp = TestApp.setUp();

  it('기본 방은 기본 보유 아이템을 장착하고 하트 4개다', async () => {
    const user = await testApp.signUp();
    const house = await itemByCode(testApp.database, 'shabby_gosiwon');

    const response = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));

    expect(response.body.equipped).toContainEqual({
      slot: 'ROOM',
      itemId: house.id,
    });
    expect(response.body).toMatchObject({
      condition: { hearts: 4, bugs: 0 },
      likeCount: 0,
      newGuestbookCount: 0,
    });
  });

  it('방을 고칠 때 집이 없으면 400, 없는 아이템은 409 not-owned, 방 밖 배치는 400이다', async () => {
    const user = await testApp.signUp();
    const [house, mansion, desk] = await Promise.all([
      itemByCode(testApp.database, 'shabby_gosiwon'),
      itemByCode(testApp.database, 'dream_mansion'),
      itemByCode(testApp.database, 'basic_desk'),
    ]);

    const noHouse = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ equipped: [{ slot: 'DESK', itemId: desk.id }] });
    const notOwned = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ equipped: [{ slot: 'ROOM', itemId: mansion.id }] });
    const outside = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ placements: [{ target: 'CHARACTER', x: 3.5, y: 1 }] });
    const ok = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        equipped: [
          { slot: 'ROOM', itemId: house.id },
          { slot: 'DESK', itemId: desk.id },
        ],
        placements: [{ target: 'DESK', x: 1.5, y: 0 }],
      });

    expect([noHouse.status, notOwned.status, outside.status]).toEqual([
      400, 409, 400,
    ]);
    expect(JSON.parse(notOwned.text).type).toBe('/problems/not-owned');
    expect(ok.status).toBe(200);
    expect(ok.body.placements).toEqual([{ target: 'DESK', x: 1.5, y: 0 }]);
  });

  it('구매와 방 저장이 동시에 와도 둘 다 성공하고 산 아이템이 장착된다', async () => {
    const user = await testApp.signUp();
    const [plant, house] = await Promise.all([
      itemByCode(testApp.database, 'green_plant'),
      itemByCode(testApp.database, 'shabby_gosiwon'),
    ]);

    const [bought, saved] = await Promise.all([
      request(testApp.server())
        .put(`/users/me/items/${plant.id}`)
        .set(as(user)),
      request(testApp.server())
        .patch('/users/me/room')
        .set(as(user))
        .send({ guestbookCheckedAt: new Date().toISOString() }),
    ]);
    const room = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));

    expect([bought.status, saved.status]).toEqual([201, 200]);
    expect(room.body.equipped).toEqual(
      expect.arrayContaining([
        { slot: 'PLANT', itemId: plant.id },
        { slot: 'ROOM', itemId: house.id },
      ]),
    );
  });

  it('남의 방은 고칠 수 없다(403)', async () => {
    const [owner, other] = await Promise.all([
      testApp.signUp(),
      testApp.signUp(),
    ]);

    const response = await request(testApp.server())
      .patch(`/users/${owner.id}/room`)
      .set(as(other))
      .send({ guestbookCheckedAt: new Date().toISOString() });

    expect(response.status).toBe(403);
  });
});
