import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('/clubs', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  let creator: SignedInUser;
  let member: SignedInUser;
  let outsider: SignedInUser;
  let clubId: string;
  const as = (user: SignedInUser) => ({
    Authorization: `Bearer ${user.token}`,
  });
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
    [creator, member, outsider] = await Promise.all([
      signUpVerifiedUser(app, mailer),
      signUpVerifiedUser(app, mailer),
      signUpVerifiedUser(app, mailer),
    ]);
  });

  afterAll(async () => {
    await database.club.deleteMany({
      where: { members: { some: { user: { email: creator.email } } } },
    });
    await database.user.deleteMany({
      where: { email: { in: [creator.email, member.email, outsider.email] } },
    });
    await app.close();
  });

  it('만들면 201과 Location을 주고, 만든 사람은 운영진 부원이고, 전체공지 분류가 생긴다', async () => {
    const response = await request(server())
      .post('/clubs')
      .set(as(creator))
      .send({
        name: ' GDGoC ',
        parts: [
          { name: 'AI', color: 'PURPLE' },
          { name: 'Dev', color: 'BLUE' },
        ],
        myPartName: 'Dev',
      });

    expect(response.status).toBe(201);
    clubId = response.body.id;
    expect(response.headers.location).toBe(`/clubs/${clubId}`);
    expect(response.body).toMatchObject({
      name: 'GDGoC',
      memberCount: 1,
      inviteCode: expect.stringMatching(/^[A-Z0-9]{8}$/),
    });
    const membership = await database.clubMember.findFirstOrThrow({
      where: { clubId, user: { email: creator.email } },
      select: {
        role: { select: { assignedOnCreate: true } },
        part: { select: { name: true } },
      },
    });
    expect(membership).toEqual({
      role: { assignedOnCreate: true },
      part: { name: 'Dev' },
    });
    const categories = await database.clubNoticeCategory.findMany({
      where: { clubId },
      select: { name: true, preset: true },
    });
    expect(categories).toEqual([{ name: '전체공지', preset: true }]);

    const part = await database.clubPart.findFirstOrThrow({
      where: { clubId, name: 'AI' },
      select: { id: true },
    });
    await insertMember(
      database,
      { clubId, partId: part.id },
      member.email,
      'member',
    );
  });

  it('myPartName이 parts에 없으면 400과 필드 오류를 준다', async () => {
    const response = await request(server())
      .post('/clubs')
      .set(as(outsider))
      .send({
        name: '동아리',
        parts: [{ name: 'AI', color: 'PURPLE' }],
        myPartName: 'Dev',
      });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).errors).toEqual([
      { field: '/body/myPartName', message: expect.any(String) },
    ]);
  });

  it('부원이 아니어도 초대 코드로 찾으면 이름·부원 수·파트를 준다', async () => {
    const { inviteCode } = await database.club.findUniqueOrThrow({
      where: { id: clubId },
      select: { inviteCode: true },
    });

    const response = await request(server())
      .get(`/clubs?inviteCode=${inviteCode}`)
      .set(as(outsider));

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      {
        id: clubId,
        name: 'GDGoC',
        memberCount: 2,
        parts: [
          { id: expect.any(String), name: 'AI', color: 'PURPLE' },
          { id: expect.any(String), name: 'Dev', color: 'BLUE' },
        ],
      },
    ]);
  });

  it('부원에게는 초대 코드를 보이지 않고, 운영진에게는 보인다', async () => {
    const asMember = await request(server())
      .get(`/clubs/${clubId}`)
      .set(as(member));
    const asCreator = await request(server())
      .get(`/clubs/${clubId}`)
      .set(as(creator));

    expect(asMember.status).toBe(200);
    expect(asMember.body.inviteCode).toBeUndefined();
    expect(asCreator.body.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
    expect(asCreator.headers.etag).toMatch(/^"\d+"$/);
  });

  it('club.update 권한이 없는 부원이 고치면 403이다', async () => {
    const response = await request(server())
      .patch(`/clubs/${clubId}`)
      .set(as(member))
      .send({ name: '바꿈' });

    expect(response.status).toBe(403);
  });

  it('If-Match가 지금 ETag와 다르면 412, 같으면 고치고 새 ETag를 준다', async () => {
    const { headers } = await request(server())
      .get(`/clubs/${clubId}`)
      .set(as(creator));
    const stale = await request(server())
      .patch(`/clubs/${clubId}`)
      .set(as(creator))
      .set('If-Match', '"999"')
      .send({ name: '바꿈' });

    const fresh = await request(server())
      .patch(`/clubs/${clubId}`)
      .set(as(creator))
      .set('If-Match', headers.etag)
      .send({ name: '바꿈' });

    expect(stale.status).toBe(412);
    expect(fresh.status).toBe(200);
    expect(fresh.body.name).toBe('바꿈');
    expect(fresh.headers.etag).not.toBe(headers.etag);
  });

  it('초대 코드를 재발급하면 옛 코드로는 찾을 수 없다', async () => {
    const before = await request(server())
      .get(`/clubs/${clubId}`)
      .set(as(creator));

    const response = await request(server())
      .post(`/clubs/${clubId}:regenerateInviteCode`)
      .set(as(creator));

    expect(response.status).toBe(200);
    expect(response.body.inviteCode).not.toBe(before.body.inviteCode);
    const old = await request(server())
      .get(`/clubs?inviteCode=${before.body.inviteCode}`)
      .set(as(outsider));
    expect(old.body.items).toEqual([]);
  });
});
