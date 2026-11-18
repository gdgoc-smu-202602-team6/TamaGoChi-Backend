import request from 'supertest';
import { itemByCode, withCatalogItem } from './game-fixtures.js';
import { as } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('room', () => {
  const testApp = TestApp.setUp();

  it('기본 방은 기본 보유 아이템을 장착하고 하트 4개다', async () => {
    const user = await testApp.signUp();
    const [house, robot] = await Promise.all([
      itemByCode(testApp.database, 'shabby_gosiwon'),
      itemByCode(testApp.database, 'robot'),
    ]);

    const response = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));

    expect(response.body.equipped).toEqual(
      expect.arrayContaining([
        { slot: 'ROOM', itemId: house.id },
        { slot: 'CHARACTER', itemId: robot.id },
      ]),
    );
    expect(response.body).toMatchObject({
      condition: { hearts: 4, bugs: 0 },
      likeCount: 0,
      newGuestbookCount: 0,
    });
  });

  it('방을 고칠 때 집이 없으면 400, 없는 아이템은 409 not-owned, 방 밖 배치는 400이다', async () => {
    const user = await testApp.signUp();
    const [house, mansion, desk, robot] = await Promise.all([
      itemByCode(testApp.database, 'shabby_gosiwon'),
      itemByCode(testApp.database, 'dream_mansion'),
      itemByCode(testApp.database, 'basic_desk'),
      itemByCode(testApp.database, 'robot'),
    ]);

    const noHouse = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        equipped: [
          { slot: 'CHARACTER', itemId: robot.id },
          { slot: 'DESK', itemId: desk.id },
        ],
      });
    const notOwned = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ equipped: [{ slot: 'ROOM', itemId: mansion.id }] });
    const outside = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        placements: [{ target: 'CHARACTER', surface: 'FLOOR', x: 3.5, y: 1 }],
      });
    const ok = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        equipped: [
          { slot: 'ROOM', itemId: house.id },
          { slot: 'CHARACTER', itemId: robot.id },
          { slot: 'DESK', itemId: desk.id },
        ],
        placements: [{ target: 'DESK', surface: 'FLOOR', x: 1, y: 0 }],
      });

    expect([noHouse.status, notOwned.status, outside.status]).toEqual([
      400, 409, 400,
    ]);
    expect(JSON.parse(notOwned.text).type).toBe('/problems/not-owned');
    expect(ok.status).toBe(200);
    expect(ok.body.placements).toEqual([
      { target: 'DESK', surface: 'FLOOR', x: 1, y: 0 },
    ]);
  });

  it('방을 고칠 때 캐릭터가 없으면 400이다', async () => {
    const user = await testApp.signUp();
    const house = await itemByCode(testApp.database, 'shabby_gosiwon');

    const response = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ equipped: [{ slot: 'ROOM', itemId: house.id }] });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).errors).toStrictEqual([
      { field: '/body/equipped', message: 'CHARACTER must be equipped' },
    ]);
  });

  it('캐릭터 장착 없이 저장된 방을 읽을 때 기본 캐릭터가 장착되어 있다', async () => {
    const user = await testApp.signUp();
    const [house, robot] = await Promise.all([
      itemByCode(testApp.database, 'shabby_gosiwon'),
      itemByCode(testApp.database, 'robot'),
    ]);
    await testApp.database.userRoom.create({
      data: {
        userId: user.id,
        items: { create: { slot: 'ROOM', itemId: house.id } },
      },
    });

    const response = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));

    expect(response.body.equipped).toContainEqual({
      slot: 'CHARACTER',
      itemId: robot.id,
    });
  });

  it('같은 크기의 집에서 이동 단위가 다른 아이템으로 바꿀 때 배치가 그 그리드에 붙는다', async () => {
    const user = await testApp.signUp();
    const [house, robot] = await Promise.all([
      itemByCode(testApp.database, 'shabby_gosiwon'),
      itemByCode(testApp.database, 'robot'),
    ]);
    await withCatalogItem(
      testApp.database,
      {
        code: 'e2e_whole_cell_desk',
        slot: 'DESK',
        name: '한 칸 책상',
        grade: 'BASIC',
        price: 0,
        surfaceKind: 'FLOOR',
        width: 2,
        height: 1,
        step: 1,
        solid: true,
      },
      async (wholeCellDesk) => {
        await testApp.database.userItem.create({
          data: { userId: user.id, itemId: wholeCellDesk.id, price: 0 },
        });
        await request(testApp.server())
          .patch('/users/me/room')
          .set(as(user))
          .send({
            placements: [{ target: 'DESK', surface: 'FLOOR', x: 0.5, y: 0 }],
          });

        const response = await request(testApp.server())
          .patch('/users/me/room')
          .set(as(user))
          .send({
            equipped: [
              { slot: 'ROOM', itemId: house.id },
              { slot: 'CHARACTER', itemId: robot.id },
              { slot: 'DESK', itemId: wholeCellDesk.id },
            ],
          });

        expect(response.status).toBe(200);
        expect(response.body.placements).toStrictEqual([
          { target: 'DESK', surface: 'FLOOR', x: 1, y: 0 },
        ]);
      },
    );
  });

  it('저장한 뒤 정책의 이동 단위가 바뀌었을 때 읽은 배치가 새 그리드에 붙는다', async () => {
    const user = await testApp.signUp();
    const desk = await itemByCode(testApp.database, 'basic_desk');
    const seeded = await testApp.database.item.findUniqueOrThrow({
      where: { id: desk.id },
      select: {
        surfaceKind: true,
        width: true,
        height: true,
        step: true,
        solid: true,
      },
    });
    await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        placements: [{ target: 'DESK', surface: 'FLOOR', x: 0.5, y: 0 }],
      });
    await testApp.database.item.update({
      where: { id: desk.id },
      data: { step: 1 },
    });
    try {
      const response = await request(testApp.server())
        .get('/users/me/room')
        .set(as(user));

      expect(response.body.placements).toStrictEqual([
        { target: 'DESK', surface: 'FLOOR', x: 1, y: 0 },
      ]);
    } finally {
      await testApp.database.item.update({
        where: { id: desk.id },
        data: { step: seeded.step },
      });
    }
  });

  it('저장한 뒤 정책이 지워졌을 때 읽은 방에서 그 배치가 빠진다', async () => {
    const user = await testApp.signUp();
    const desk = await itemByCode(testApp.database, 'basic_desk');
    const seeded = await testApp.database.item.findUniqueOrThrow({
      where: { id: desk.id },
      select: {
        surfaceKind: true,
        width: true,
        height: true,
        step: true,
        solid: true,
      },
    });
    await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        placements: [
          { target: 'DESK', surface: 'FLOOR', x: 0.5, y: 0 },
          { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1 },
        ],
      });
    await testApp.database.item.update({
      where: { id: desk.id },
      data: {
        surfaceKind: null,
        width: null,
        height: null,
        step: null,
        solid: null,
      },
    });
    try {
      const response = await request(testApp.server())
        .get('/users/me/room')
        .set(as(user));

      expect(response.body.placements).toStrictEqual([
        { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1 },
      ]);
    } finally {
      await testApp.database.item.update({
        where: { id: desk.id },
        data: seeded,
      });
    }
  });

  it('벽에 거는 아이템을 두 벽의 끝 칸까지 놓을 때 저장되고 대상 순서와 벽 높이 3으로 돌아온다', async () => {
    const user = await testApp.signUp();
    await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        placements: [
          { target: 'WINDOW', surface: 'RIGHT_WALL', x: 1, y: 1 },
          { target: 'CLOCK', surface: 'LEFT_WALL', x: 2, y: 2 },
        ],
      });

    const response = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));

    expect(response.body.placements).toStrictEqual([
      { target: 'CLOCK', surface: 'LEFT_WALL', x: 2, y: 2 },
      { target: 'WINDOW', surface: 'RIGHT_WALL', x: 1, y: 1 },
    ]);
    expect(response.body.wallHeight).toBe(3);
  });

  it.each([
    [
      '벽에 거는 아이템을 바닥에',
      { target: 'CLOCK', surface: 'FLOOR', x: 0, y: 0 },
    ],
    [
      '바닥에 놓는 아이템을 벽에',
      { target: 'DESK', surface: 'LEFT_WALL', x: 0, y: 0 },
    ],
    [
      '크기 사각형이 벽 위로 나가게',
      { target: 'CLOCK', surface: 'LEFT_WALL', x: 0, y: 2.5 },
    ],
    [
      '크기 사각형이 벽 옆으로 나가게',
      { target: 'WINDOW', surface: 'RIGHT_WALL', x: 1.5, y: 0 },
    ],
    [
      '크기 사각형이 바닥 밖으로 나가게',
      { target: 'DESK', surface: 'FLOOR', x: 1.5, y: 0 },
    ],
    [
      '벽에서 이동 단위 밖에',
      { target: 'CLOCK', surface: 'RIGHT_WALL', x: 0.25, y: 0 },
    ],
  ])('%s 놓을 때 400이다', async (_, placement) => {
    const user = await testApp.signUp();

    const response = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ placements: [placement] });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).errors).toStrictEqual([
      {
        field: '/body/placements/0',
        message:
          'not on a surface of its kind, outside the surface or off its grid',
      },
    ]);
  });

  it.each([
    [
      '바닥에서 책상과 캐릭터가',
      { target: 'DESK', surface: 'FLOOR', x: 0, y: 0 },
      { target: 'CHARACTER', surface: 'FLOOR', x: 1.5, y: 0.5 },
    ],
    [
      '한 벽에서 시계와 창문이',
      { target: 'WINDOW', surface: 'LEFT_WALL', x: 0, y: 0 },
      { target: 'CLOCK', surface: 'LEFT_WALL', x: 1.5, y: 1.5 },
    ],
  ])('%s 겹치게 놓을 때 400이다', async (_, first, second) => {
    const user = await testApp.signUp();

    const response = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ placements: [first, second] });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).errors).toStrictEqual([
      {
        field: '/body/placements/1',
        message: 'overlaps another placement on its surface',
      },
    ]);
  });

  it('변만 도달하거나, 다른 벽이거나, 러그와 겹칠 때 저장된다', async () => {
    const user = await testApp.signUp();
    const [house, robot, desk, rug, clock, basicWindow] = await Promise.all(
      [
        'shabby_gosiwon',
        'robot',
        'basic_desk',
        'royal_rug',
        'basic_clock',
        'basic_window',
      ].map((code) => itemByCode(testApp.database, code)),
    );
    await testApp.database.userItem.create({
      data: { userId: user.id, itemId: rug.id, price: 0 },
    });
    const placements = [
      { target: 'CHARACTER', surface: 'FLOOR', x: 2, y: 0 },
      { target: 'CLOCK', surface: 'RIGHT_WALL', x: 0, y: 0 },
      { target: 'DESK', surface: 'FLOOR', x: 0, y: 0 },
      { target: 'RUG', surface: 'FLOOR', x: 0.5, y: 0 },
      { target: 'WINDOW', surface: 'LEFT_WALL', x: 0, y: 0 },
    ];

    const response = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        equipped: [
          { slot: 'ROOM', itemId: house.id },
          { slot: 'CHARACTER', itemId: robot.id },
          { slot: 'DESK', itemId: desk.id },
          { slot: 'RUG', itemId: rug.id },
          { slot: 'CLOCK', itemId: clock.id },
          { slot: 'WINDOW', itemId: basicWindow.id },
        ],
        placements,
      });

    expect(response.status).toBe(200);
    expect(response.body.placements).toStrictEqual(placements);
  });

  it('작은 집으로 이사할 때 위치가 면을 따라 옮겨지고 겹치게 된 배치는 빠진다', async () => {
    const user = await testApp.signUp();
    const [smallHouse, bigHouse, robot, plant, clock] = await Promise.all([
      itemByCode(testApp.database, 'shabby_gosiwon'),
      itemByCode(testApp.database, 'dream_mansion'),
      itemByCode(testApp.database, 'robot'),
      itemByCode(testApp.database, 'green_plant'),
      itemByCode(testApp.database, 'basic_clock'),
    ]);
    await testApp.database.userItem.createMany({
      data: [bigHouse, plant].map((item) => ({
        userId: user.id,
        itemId: item.id,
        price: 0,
      })),
    });
    const equippedWith = (house: { id: string }) => [
      { slot: 'ROOM', itemId: house.id },
      { slot: 'CHARACTER', itemId: robot.id },
      { slot: 'PLANT', itemId: plant.id },
      { slot: 'CLOCK', itemId: clock.id },
    ];
    await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        equipped: equippedWith(bigHouse),
        placements: [
          { target: 'CHARACTER', surface: 'FLOOR', x: 4, y: 4 },
          { target: 'PLANT', surface: 'FLOOR', x: 5, y: 5 },
          { target: 'CLOCK', surface: 'LEFT_WALL', x: 4, y: 1 },
        ],
      });

    const response = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({ equipped: equippedWith(smallHouse) });

    expect(response.status).toBe(200);
    expect(response.body.placements).toStrictEqual([
      { target: 'CHARACTER', surface: 'FLOOR', x: 2, y: 2 },
      { target: 'CLOCK', surface: 'LEFT_WALL', x: 2, y: 1 },
    ]);
  });

  it('큰 집으로 이사할 때 바닥은 두 축, 벽은 x만 비례로 옮겨지고 벽의 y는 그대로다', async () => {
    const user = await testApp.signUp();
    const [bigHouse, robot, clock] = await Promise.all([
      itemByCode(testApp.database, 'dream_mansion'),
      itemByCode(testApp.database, 'robot'),
      itemByCode(testApp.database, 'basic_clock'),
    ]);
    await testApp.database.userItem.create({
      data: { userId: user.id, itemId: bigHouse.id, price: 0 },
    });
    await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        placements: [
          { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 0.5 },
          { target: 'CLOCK', surface: 'LEFT_WALL', x: 1, y: 2 },
        ],
      });

    const response = await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        equipped: [
          { slot: 'ROOM', itemId: bigHouse.id },
          { slot: 'CHARACTER', itemId: robot.id },
          { slot: 'CLOCK', itemId: clock.id },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.placements).toStrictEqual([
      { target: 'CHARACTER', surface: 'FLOOR', x: 2, y: 1 },
      { target: 'CLOCK', surface: 'LEFT_WALL', x: 2, y: 2 },
    ]);
  });

  it('같은 부위를 더 큰 아이템으로 바꿔 겹치게 될 때 대상 순서에서 뒤의 배치가 빠진다', async () => {
    const user = await testApp.signUp();
    const [house, robot] = await Promise.all([
      itemByCode(testApp.database, 'shabby_gosiwon'),
      itemByCode(testApp.database, 'robot'),
    ]);
    await withCatalogItem(
      testApp.database,
      {
        code: 'e2e_wide_desk',
        slot: 'DESK',
        name: '긴 책상',
        grade: 'BASIC',
        price: 0,
        surfaceKind: 'FLOOR',
        width: 3,
        height: 1,
        step: 0.5,
        solid: true,
      },
      async (wideDesk) => {
        await testApp.database.userItem.create({
          data: { userId: user.id, itemId: wideDesk.id, price: 0 },
        });
        await request(testApp.server())
          .patch('/users/me/room')
          .set(as(user))
          .send({
            placements: [
              { target: 'DESK', surface: 'FLOOR', x: 0, y: 0 },
              { target: 'CHARACTER', surface: 'FLOOR', x: 2, y: 0 },
            ],
          });

        const response = await request(testApp.server())
          .patch('/users/me/room')
          .set(as(user))
          .send({
            equipped: [
              { slot: 'ROOM', itemId: house.id },
              { slot: 'CHARACTER', itemId: robot.id },
              { slot: 'DESK', itemId: wideDesk.id },
            ],
          });

        expect(response.status).toBe(200);
        expect(response.body.placements).toStrictEqual([
          { target: 'CHARACTER', surface: 'FLOOR', x: 2, y: 0 },
        ]);
      },
    );
  });

  it('같은 부위의 면 종류가 다른 아이템을 사서 장착할 때 그 부위의 배치가 빠진다', async () => {
    const user = await testApp.signUp();
    await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        placements: [
          { target: 'CLOCK', surface: 'LEFT_WALL', x: 0, y: 0 },
          { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1 },
        ],
      });
    await withCatalogItem(
      testApp.database,
      {
        code: 'e2e_floor_clock',
        slot: 'CLOCK',
        name: '탁상시계',
        grade: 'BASIC',
        price: 0,
        surfaceKind: 'FLOOR',
        width: 1,
        height: 1,
        step: 0.5,
        solid: true,
      },
      async (floorClock) => {
        const bought = await request(testApp.server())
          .put(`/users/me/items/${floorClock.id}`)
          .set(as(user));
        const room = await request(testApp.server())
          .get('/users/me/room')
          .set(as(user));

        expect(bought.status).toBe(201);
        expect(room.body.equipped).toContainEqual({
          slot: 'CLOCK',
          itemId: floorClock.id,
        });
        expect(room.body.placements).toStrictEqual([
          { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1 },
        ]);
      },
    );
  });

  it('저장한 뒤 정책의 면 종류가 바뀌었을 때 읽은 방에서 그 배치가 빠진다', async () => {
    const user = await testApp.signUp();
    const clock = await itemByCode(testApp.database, 'basic_clock');
    const seeded = await testApp.database.item.findUniqueOrThrow({
      where: { id: clock.id },
      select: {
        surfaceKind: true,
        width: true,
        height: true,
        step: true,
        solid: true,
      },
    });
    await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        placements: [
          { target: 'CLOCK', surface: 'LEFT_WALL', x: 0, y: 0 },
          { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1 },
        ],
      });
    await testApp.database.item.update({
      where: { id: clock.id },
      data: { surfaceKind: 'FLOOR' },
    });
    try {
      const response = await request(testApp.server())
        .get('/users/me/room')
        .set(as(user));

      expect(response.body.placements).toStrictEqual([
        { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1 },
      ]);
    } finally {
      await testApp.database.item.update({
        where: { id: clock.id },
        data: { surfaceKind: seeded.surfaceKind },
      });
    }
  });

  it('다른 캐릭터를 사면 그 캐릭터로 바뀌고 캐릭터 배치는 그대로다', async () => {
    const user = await testApp.signUp();
    const hamster = await itemByCode(testApp.database, 'hamster');
    await request(testApp.server())
      .patch('/users/me/room')
      .set(as(user))
      .send({
        placements: [{ target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1.5 }],
      });

    const bought = await request(testApp.server())
      .put(`/users/me/items/${hamster.id}`)
      .set(as(user));
    const room = await request(testApp.server())
      .get('/users/me/room')
      .set(as(user));

    expect(bought.status).toBe(201);
    expect(room.body.equipped).toContainEqual({
      slot: 'CHARACTER',
      itemId: hamster.id,
    });
    expect(room.body.placements).toStrictEqual([
      { target: 'CHARACTER', surface: 'FLOOR', x: 1, y: 1.5 },
    ]);
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
