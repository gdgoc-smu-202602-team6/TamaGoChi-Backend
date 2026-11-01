import request from 'supertest';
import { itemByCode, studied } from './game-fixtures.js';
import { as } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('items', () => {
  const testApp = TestApp.setUp();

  it('카탈로그는 탭으로 거를 수 있다', async () => {
    const user = await testApp.signUp();

    const response = await request(testApp.server())
      .get('/items?category=ROOM_SIZE')
      .set(as(user));

    expect(
      response.body.items.every(
        (item: { slot: string }) => item.slot === 'ROOM',
      ),
    ).toBe(true);
  });

  it('사면 201로 볼트가 줄고 자동 장착되며, 다시 사면 200이다', async () => {
    const user = await testApp.signUp();
    const plant = await itemByCode(testApp.database, 'green_plant');

    const bought = await request(testApp.server())
      .put(`/users/me/items/${plant.id}`)
      .set(as(user));
    const again = await request(testApp.server())
      .put(`/users/me/items/${plant.id}`)
      .set(as(user));
    const stats = await request(testApp.server())
      .get('/users/me/stats')
      .set(as(user));
    const room = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));

    expect([bought.status, again.status]).toEqual([201, 200]);
    expect(bought.body).toMatchObject({ itemId: plant.id, pricePaid: 40 });
    expect(stats.body.volts).toBe(60);
    expect(room.body.equipped).toContainEqual({
      slot: 'PLANT',
      itemId: plant.id,
    });
  });

  it('레벨이 모자라면 409 level-locked, 볼트가 모자라면 409 insufficient-volts다', async () => {
    const user = await testApp.signUp();
    const [glasses, stand] = await Promise.all([
      itemByCode(testApp.database, 'study_glasses'),
      itemByCode(testApp.database, 'sparkle_stand'),
    ]);
    await studied(testApp.database, user.id, 400, 330);

    const locked = await request(testApp.server())
      .put(`/users/me/items/${glasses.id}`)
      .set(as(user));
    await testApp.database.userItem.create({
      data: { userId: user.id, itemId: glasses.id, price: 400 },
    });
    const poor = await request(testApp.server())
      .put(`/users/me/items/${stand.id}`)
      .set(as(user));

    expect(JSON.parse(locked.text)).toMatchObject({
      type: '/problems/level-locked',
      requiredLevel: 10,
    });
    expect(JSON.parse(poor.text)).toMatchObject({
      type: '/problems/insufficient-volts',
      shortBy: 30,
    });
  });
});
