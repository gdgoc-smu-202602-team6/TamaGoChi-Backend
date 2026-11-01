import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { NoticeDispatcher } from '../src/domains/club/clubs/notices/notice-dispatcher.js';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('notices', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  let operator: SignedInUser;
  let member: SignedInUser;
  let clubId: string;
  let presetId: string;
  const server = () => app.getHttpServer();
  const as = (user: SignedInUser) => ({
    Authorization: `Bearer ${user.token}`,
  });
  const path = () => `/clubs/${clubId}/notices`;
  const write = (title: string, extra: object = {}) =>
    request(server())
      .post(path())
      .set(as(operator))
      .send({ categoryId: presetId, title, body: '본문', ...extra });

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
    [operator, member] = await Promise.all([
      signUpVerifiedUser(app, mailer),
      signUpVerifiedUser(app, mailer),
    ]);
    const created = await request(server())
      .post('/clubs')
      .set(as(operator))
      .send({
        name: '공지',
        parts: [{ name: 'Dev', color: 'BLUE' }],
        myPartName: 'Dev',
      });
    clubId = created.body.id;
    const part = await database.clubPart.findFirstOrThrow({
      where: { clubId },
    });
    await insertMember(
      database,
      { clubId, partId: part.id },
      member.email,
      'member',
    );
    presetId = (
      await database.clubNoticeCategory.findFirstOrThrow({
        where: { clubId, preset: true },
      })
    ).id;
  });

  afterAll(async () => {
    await database.club.deleteMany({ where: { id: clubId } });
    await database.user.deleteMany({
      where: { email: { in: [operator.email, member.email] } },
    });
    await app.close();
  });

  it('운영진이 쓰면 201이고, 권한 없는 부원은 403이다', async () => {
    const written = await write('첫 공지');
    const denied = await request(server())
      .post(path())
      .set(as(member))
      .send({ categoryId: presetId, title: '몰래', body: '본문' });

    expect(written.status).toBe(201);
    expect(written.body).toMatchObject({
      title: '첫 공지',
      pinned: false,
      notificationState: 'NONE',
      read: false,
    });
    expect(denied.status).toBe(403);
  });

  it('제목이 공백뿐이거나 다른 동아리의 분류면 400이다', async () => {
    const blank = await write('   ');
    const foreign = await request(server())
      .post(path())
      .set(as(operator))
      .send({
        categoryId: '00000000-0000-7000-8000-000000000000',
        title: '제목',
        body: '본문',
      });

    expect([blank.status, foreign.status]).toEqual([400, 400]);
  });

  it('고정 공지가 먼저, 그 안에서 최근 것이 먼저이고 페이지를 넘겨도 이어진다', async () => {
    const older = await write('오래된 고정', { pinned: true });
    const newer = await write('새 일반');
    const pinned = await write('새 고정', { pinned: true });

    const first = await request(server())
      .get(`${path()}?pageSize=2`)
      .set(as(member));
    const second = await request(server())
      .get(`${path()}?pageSize=2&pageToken=${first.body.nextPageToken}`)
      .set(as(member));

    const ids = [...first.body.items, ...second.body.items].map(
      (one: { id: string }) => one.id,
    );
    expect(ids.slice(0, 3)).toEqual([
      pinned.body.id,
      older.body.id,
      newer.body.id,
    ]);
  });

  it('읽으면 read가 true가 되고 읽지 않은 수가 준다', async () => {
    const unread = () =>
      request(server())
        .get(`${path()}?read=false&totalSize=true&pageSize=0`)
        .set(as(member));
    const notice = await write('읽을 공지');
    const before = await unread();

    await request(server())
      .put(`${path()}/${notice.body.id}/reads/me`)
      .set(as(member))
      .expect(204);
    const after = await unread();
    const read = await request(server())
      .get(`${path()}/${notice.body.id}`)
      .set(as(member));

    expect(after.body.totalSize).toBe(before.body.totalSize - 1);
    expect(after.body.items).toEqual([]);
    expect(read.body.read).toBe(true);
  });

  it('알림을 켜고 쓰면 PENDING으로 답하고, 보낸 뒤 SENT가 된다', async () => {
    const written = await write('알림 공지', { notify: true });

    let state = written.body.notificationState;
    for (let tries = 0; tries < 20 && state === 'PENDING'; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      state = (
        await request(server())
          .get(`${path()}/${written.body.id}`)
          .set(as(member))
      ).body.notificationState;
    }

    expect(written.body.notificationState).toBe('PENDING');
    expect(state).toBe('SENT');
  });

  it('재시작 등으로 PENDING에 남은 공지는 발송을 다시 돌리면 SENT가 된다', async () => {
    const author = await database.user.findUniqueOrThrow({
      where: { email: operator.email },
    });
    const left = await database.clubNotice.create({
      data: {
        clubId,
        categoryId: presetId,
        authorUserId: author.id,
        title: '남은 공지',
        body: '본문',
        notificationState: 'PENDING',
      },
    });

    app.get(NoticeDispatcher).sendPending();
    let state = 'PENDING';
    for (let tries = 0; tries < 20 && state === 'PENDING'; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      state = (
        await database.clubNotice.findUniqueOrThrow({ where: { id: left.id } })
      ).notificationState;
    }

    expect(state).toBe('SENT');
  });

  it('수정은 보낸 필드만 바꾸고, 삭제하면 404가 된다', async () => {
    const notice = await write('고칠 공지');

    const updated = await request(server())
      .patch(`${path()}/${notice.body.id}`)
      .set(as(operator))
      .send({ pinned: true });
    await request(server())
      .delete(`${path()}/${notice.body.id}`)
      .set(as(operator))
      .expect(204);
    const gone = await request(server())
      .get(`${path()}/${notice.body.id}`)
      .set(as(member));

    expect(updated.body).toMatchObject({ title: '고칠 공지', pinned: true });
    expect(gone.status).toBe(404);
  });
});
