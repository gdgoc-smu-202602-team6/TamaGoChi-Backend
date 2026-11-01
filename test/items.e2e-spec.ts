import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { itemByCode, studied } from './game-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('items', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  const emails: string[] = [];
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
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  it('카탈로그는 탭으로 거를 수 있다', async () => {
    const user = await signUp();

    const response = await request(server())
      .get('/items?category=ROOM_SIZE')
      .set(as(user));

    expect(
      response.body.items.every(
        (item: { slot: string }) => item.slot === 'ROOM',
      ),
    ).toBe(true);
  });

  it('사면 201로 볼트가 줄고 자동 장착되며, 다시 사면 200이다', async () => {
    const user = await signUp();
    const plant = await itemByCode(database, 'green_plant');

    const bought = await request(server())
      .put(`/users/me/items/${plant.id}`)
      .set(as(user));
    const again = await request(server())
      .put(`/users/me/items/${plant.id}`)
      .set(as(user));
    const stats = await request(server()).get('/users/me/stats').set(as(user));
    const room = await request(server()).get('/users/me/room').set(as(user));

    expect([bought.status, again.status]).toEqual([201, 200]);
    expect(bought.body).toMatchObject({ itemId: plant.id, pricePaid: 40 });
    expect(stats.body.volts).toBe(60);
    expect(room.body.equipped).toContainEqual({
      slot: 'PLANT',
      itemId: plant.id,
    });
  });

  it('레벨이 모자라면 409 level-locked, 볼트가 모자라면 409 insufficient-volts다', async () => {
    const user = await signUp();
    const [glasses, stand] = await Promise.all([
      itemByCode(database, 'study_glasses'),
      itemByCode(database, 'sparkle_stand'),
    ]);
    await studied(database, user.id, 400, 330);

    const locked = await request(server())
      .put(`/users/me/items/${glasses.id}`)
      .set(as(user));
    await database.userItem.create({
      data: { userId: user.id, itemId: glasses.id, price: 400 },
    });
    const poor = await request(server())
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
