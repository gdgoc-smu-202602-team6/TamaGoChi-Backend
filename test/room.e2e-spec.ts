import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { itemByCode } from './game-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('room', () => {
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

  it('기본 방은 기본 보유 아이템을 장착하고 하트 4개다', async () => {
    const user = await signUp();
    const house = await itemByCode(database, 'shabby_gosiwon');

    const response = await request(server())
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
    const user = await signUp();
    const [house, mansion, desk] = await Promise.all([
      itemByCode(database, 'shabby_gosiwon'),
      itemByCode(database, 'dream_mansion'),
      itemByCode(database, 'basic_desk'),
    ]);

    const noHouse = await request(server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ equipped: [{ slot: 'DESK', itemId: desk.id }] });
    const notOwned = await request(server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ equipped: [{ slot: 'ROOM', itemId: mansion.id }] });
    const outside = await request(server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ placements: [{ target: 'CHARACTER', x: 3.5, y: 1 }] });
    const ok = await request(server())
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
    const user = await signUp();
    const [plant, house] = await Promise.all([
      itemByCode(database, 'green_plant'),
      itemByCode(database, 'shabby_gosiwon'),
    ]);

    const [bought, saved] = await Promise.all([
      request(server()).put(`/users/me/items/${plant.id}`).set(as(user)),
      request(server())
        .patch('/users/me/room')
        .set(as(user))
        .send({ guestbookCheckedAt: new Date().toISOString() }),
    ]);
    const room = await request(server()).get('/users/me/room').set(as(user));

    expect([bought.status, saved.status]).toEqual([201, 200]);
    expect(room.body.equipped).toEqual(
      expect.arrayContaining([
        { slot: 'PLANT', itemId: plant.id },
        { slot: 'ROOM', itemId: house.id },
      ]),
    );
  });

  it('남의 방은 고칠 수 없다(403)', async () => {
    const [owner, other] = await Promise.all([signUp(), signUp()]);

    const response = await request(server())
      .patch(`/users/${owner.id}/room`)
      .set(as(other))
      .send({ guestbookCheckedAt: new Date().toISOString() });

    expect(response.status).toBe(403);
  });
});
