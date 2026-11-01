import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Day } from '../src/domains/game/day/day.js';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertClub, insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

const minute = 60 * 1000;

describe('game', () => {
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

  /** An ended session of `length` minutes that started `ago` minutes ago. */
  const studied = (userId: string, ago: number, length: number) =>
    database.userStudySession.create({
      data: {
        userId,
        startedAt: new Date(Date.now() - ago * minute),
        endedAt: new Date(Date.now() - (ago - length) * minute),
      },
    });

  const itemByCode = (code: string) =>
    database.item.findUniqueOrThrow({ where: { code } });

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
  });

  afterAll(async () => {
    await database.club.deleteMany({ where: { id: { in: clubIds } } });
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  describe('dailyGoals', () => {
    it('내일부터의 목표는 201, 오늘부터는 400, 같은 적용일은 409다', async () => {
      const user = await signUp();
      const today = Day.of(new Date());

      const ok = await request(server())
        .post('/users/me/dailyGoals')
        .set(as(user))
        .send({ startOn: today.plus(1).toString(), minutes: 120 });
      const todayStart = await request(server())
        .post('/users/me/dailyGoals')
        .set(as(user))
        .send({ startOn: today.toString(), minutes: 120 });
      const duplicate = await request(server())
        .post('/users/me/dailyGoals')
        .set(as(user))
        .send({ startOn: today.plus(1).toString(), minutes: 60 });

      expect([ok.status, todayStart.status, duplicate.status]).toEqual([
        201, 400, 409,
      ]);
      const created = await request(server())
        .get(ok.headers.location)
        .set(as(user));
      expect(created.body).toEqual({
        startOn: today.plus(1).toString(),
        minutes: 120,
      });
      expect(JSON.parse(duplicate.text).type).toBe(
        '/problems/duplicate-start-on',
      );
    });

    it('버전이 없는 날의 목표는 180분 기본값이다', async () => {
      const user = await signUp();

      const response = await request(server())
        .get(`/users/me/dailyGoals?on=${Day.of(new Date()).toString()}`)
        .set(as(user));

      expect(response.body.items).toEqual([{ startOn: null, minutes: 180 }]);
    });
  });

  describe('studySessions', () => {
    it('시작하면 201, 진행 중에 또 시작하면 409 session-running이다', async () => {
      const user = await signUp();

      const first = await request(server())
        .post('/users/me/studySessions')
        .set(as(user));
      const second = await request(server())
        .post('/users/me/studySessions')
        .set(as(user));

      expect(first.status).toBe(201);
      expect(first.body).toMatchObject({ state: 'RUNNING', studiedSeconds: 0 });
      expect(JSON.parse(second.text).type).toBe('/problems/session-running');
    });

    it('끝내면 결과를 주고, 다시 읽어도 같고, 다시 끝내면 409 session-ended다', async () => {
      const user = await signUp();
      const session = await database.userStudySession.create({
        data: {
          userId: user.id,
          startedAt: new Date(Date.now() - 31 * minute),
        },
      });

      const ended = await request(server())
        .patch(`/users/me/studySessions/${session.id}`)
        .set(as(user))
        .send({ state: 'ENDED' });
      const again = await request(server())
        .get(`/users/me/studySessions/${session.id}`)
        .set(as(user));
      const twice = await request(server())
        .patch(`/users/me/studySessions/${session.id}`)
        .set(as(user))
        .send({ state: 'ENDED' });

      expect(ended.body.result).toMatchObject({
        studiedMinutes: 31,
        volts: 31,
        attendanceBonusXp: 10,
        attendedNow: true,
        heartsChange: 0,
      });
      expect(again.body.result).toEqual(ended.body.result);
      expect(JSON.parse(twice.text).type).toBe('/problems/session-ended');
    });

    it('기기 시각이 시작 뒤이고 도착보다 이르면 그 시각으로 끝낸다', async () => {
      const user = await signUp();
      const session = await database.userStudySession.create({
        data: {
          userId: user.id,
          startedAt: new Date(Date.now() - 50 * minute),
        },
      });
      const clientEndedAt = new Date(Date.now() - 20 * minute).toISOString();

      const response = await request(server())
        .patch(`/users/me/studySessions/${session.id}`)
        .set(as(user))
        .send({ state: 'ENDED', clientEndedAt });

      expect(response.body.endedAt).toBe(clientEndedAt);
      expect(response.body.result.studiedMinutes).toBe(30);
    });

    it('12시간을 넘겨 남은 세션은 12시간에 끝난 것으로 보고 새로 시작할 수 있다', async () => {
      const user = await signUp();
      const old = await database.userStudySession.create({
        data: {
          userId: user.id,
          startedAt: new Date(Date.now() - 13 * 60 * minute),
        },
      });

      const started = await request(server())
        .post('/users/me/studySessions')
        .set(as(user));
      const closed = await database.userStudySession.findUniqueOrThrow({
        where: { id: old.id },
      });

      expect(started.status).toBe(201);
      expect(closed.endedAt!.getTime() - closed.startedAt.getTime()).toBe(
        12 * 60 * minute,
      );
    });
  });

  describe('stats', () => {
    it('새 사용자는 볼트 100, Lv.1, 이용 1일차다', async () => {
      const user = await signUp();

      const response = await request(server())
        .get('/users/me/stats')
        .set(as(user));

      expect(response.body).toMatchObject({
        volts: 100,
        xp: 0,
        level: 1,
        nextLevelXp: 100,
        dayNumber: 1,
      });
      expect(response.body.week).toHaveLength(7);
    });

    it('61분 공부하면 볼트 161, XP는 61분과 출석 보너스 10이다', async () => {
      const user = await signUp();
      await studied(user.id, 70, 61);

      const response = await request(server())
        .get('/users/me/stats')
        .set(as(user));

      expect(response.body).toMatchObject({
        volts: 161,
        xp: 71,
        todayAttended: true,
        todaySeconds: 61 * 60,
      });
    });

    it('진행 중인 세션은 출석 표시에는 들고 XP에는 들지 않는다', async () => {
      const user = await signUp();
      await database.userStudySession.create({
        data: {
          userId: user.id,
          startedAt: new Date(Date.now() - 40 * minute),
        },
      });

      const response = await request(server())
        .get('/users/me/stats')
        .set(as(user));

      expect(response.body).toMatchObject({
        todayAttended: true,
        xp: 0,
        volts: 100,
      });
    });

    it('승인된 날은 공부하지 않아도 하트가 줄지 않고, 동아리를 나가도 그렇다', async () => {
      const user = await signUp();
      const yesterday = Day.of(new Date()).plus(-1).start;
      await database.user.update({
        where: { id: user.id },
        data: { createdAt: new Date(yesterday.getTime() + minute) },
      });
      const club = await insertClub(database);
      clubIds.push(club.clubId);
      await database.clubApplication.create({
        data: {
          clubId: club.clubId,
          userId: user.id,
          partId: club.partId,
          state: 'APPROVED',
          decidedAt: new Date(yesterday.getTime() + 2 * minute),
        },
      });

      const room = await request(server()).get('/users/me/room').set(as(user));
      const stats = await request(server())
        .get('/users/me/stats')
        .set(as(user));

      expect(room.body.condition.hearts).toBe(4);
      expect(stats.body.absenceStreak).toBe(0);
    });

    it('5일 전에 만든 계정이 공부하지 않았으면 하트 0, 버그 3이고 지난 날들이 확정된다', async () => {
      const user = await signUp();
      const fiveDaysAgo = Day.of(new Date()).plus(-5).start;
      await database.user.update({
        where: { id: user.id },
        data: { createdAt: new Date(fiveDaysAgo.getTime() + minute) },
      });

      const stats = await request(server())
        .get('/users/me/stats')
        .set(as(user));
      const room = await request(server()).get('/users/me/room').set(as(user));
      const confirmed = await database.userDaySettlement.count({
        where: { userId: user.id },
      });

      expect(stats.body).toMatchObject({ dayNumber: 6, absenceStreak: 5 });
      expect(room.body.condition).toMatchObject({ hearts: 0, bugs: 3 });
      expect(confirmed).toBe(5);
    });
  });

  describe('items and rooms', () => {
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

    it('기본 방은 기본 보유 아이템을 장착하고 하트 4개다', async () => {
      const user = await signUp();
      const house = await itemByCode('shabby_gosiwon');

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

    it('사면 201로 볼트가 줄고 자동 장착되며, 다시 사면 200이다', async () => {
      const user = await signUp();
      const plant = await itemByCode('green_plant');

      const bought = await request(server())
        .put(`/users/me/items/${plant.id}`)
        .set(as(user));
      const again = await request(server())
        .put(`/users/me/items/${plant.id}`)
        .set(as(user));
      const stats = await request(server())
        .get('/users/me/stats')
        .set(as(user));
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
        itemByCode('study_glasses'),
        itemByCode('sparkle_stand'),
      ]);
      await studied(user.id, 400, 330);

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

    it('방을 고칠 때 집이 없으면 400, 없는 아이템은 409 not-owned, 방 밖 배치는 400이다', async () => {
      const user = await signUp();
      const [house, mansion, desk] = await Promise.all([
        itemByCode('shabby_gosiwon'),
        itemByCode('dream_mansion'),
        itemByCode('basic_desk'),
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
        itemByCode('green_plant'),
        itemByCode('shabby_gosiwon'),
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

  describe('friends', () => {
    let host: SignedInUser & { id: string };
    let friend: SignedInUser & { id: string };
    let stranger: SignedInUser & { id: string };
    let clubId: string;
    let hostMemberId: string;

    beforeAll(async () => {
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

    it('같은 동아리 부원의 방·통계는 보이고, 아니면 404다', async () => {
      const seen = await request(server())
        .get(`/users/${host.id}/room`)
        .set(as(friend));
      const batch = await request(server())
        .get(`/users/-/stats:batchGet?userIds=${host.id},${friend.id}`)
        .set(as(friend));
      const hidden = await request(server())
        .get(`/users/${host.id}/stats`)
        .set(as(stranger));

      expect(seen.status).toBe(200);
      expect(seen.body.newGuestbookCount).toBeUndefined();
      expect(
        batch.body.items.map((one: { userId: string }) => one.userId),
      ).toEqual([host.id, friend.id]);
      expect(hidden.status).toBe(404);
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

      expect([written.status, own.status, blank.status]).toEqual([
        201, 400, 400,
      ]);
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
        partId: (
          await database.clubPart.findFirstOrThrow({ where: { clubId } })
        ).id,
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
});
