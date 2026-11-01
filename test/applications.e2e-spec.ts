import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('applications', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  let operator: SignedInUser;
  let member: SignedInUser;
  let applicant: SignedInUser;
  let other: SignedInUser;
  let clubId: string;
  let secondClubId: string;
  let partId: string;
  let applicationId: string;
  const as = (user: SignedInUser) => ({
    Authorization: `Bearer ${user.token}`,
  });
  const server = () => app.getHttpServer();

  const createClub = async (name: string) => {
    const response = await request(server())
      .post('/clubs')
      .set(as(operator))
      .send({
        name,
        parts: [{ name: 'Dev', color: 'BLUE' }],
        myPartName: 'Dev',
      });
    const part = await database.clubPart.findFirstOrThrow({
      where: { clubId: response.body.id },
    });
    return { clubId: response.body.id as string, partId: part.id };
  };

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
    [operator, member, applicant, other] = await Promise.all([
      signUpVerifiedUser(app, mailer),
      signUpVerifiedUser(app, mailer),
      signUpVerifiedUser(app, mailer, '지원자'),
      signUpVerifiedUser(app, mailer),
    ]);
    ({ clubId, partId } = await createClub('신청'));
    secondClubId = (await createClub('두번째')).clubId;
    await insertMember(database, { clubId, partId }, member.email, 'member');
  });

  afterAll(async () => {
    await database.club.deleteMany({
      where: { id: { in: [clubId, secondClubId] } },
    });
    await database.user.deleteMany({
      where: {
        email: {
          in: [operator.email, member.email, applicant.email, other.email],
        },
      },
    });
    await app.close();
  });

  it('신청하면 201과 PENDING, 닉네임·이메일을 준다', async () => {
    const response = await request(server())
      .post(`/clubs/${clubId}/applications`)
      .set(as(applicant))
      .send({ partId });

    expect(response.status).toBe(201);
    applicationId = response.body.id;
    expect(response.headers.location).toBe(
      `/clubs/${clubId}/applications/${applicationId}`,
    );
    expect(response.body).toMatchObject({
      state: 'PENDING',
      nickname: '지원자',
      email: applicant.email,
      partId,
    });
  });

  it('대기 중인 신청이 있으면 409 application-pending이다', async () => {
    const response = await request(server())
      .post(`/clubs/${clubId}/applications`)
      .set(as(applicant))
      .send({ partId });

    expect(JSON.parse(response.text)).toMatchObject({
      status: 409,
      type: '/problems/application-pending',
    });
  });

  it('다른 동아리의 파트로 신청하면 400이다', async () => {
    const response = await request(server())
      .post(`/clubs/${secondClubId}/applications`)
      .set(as(applicant))
      .send({ partId });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).errors[0].field).toBe('/body/partId');
  });

  it('운영진은 대기 목록을 보고, 권한 없는 부원은 403이다', async () => {
    const asOperator = await request(server())
      .get(`/clubs/${clubId}/applications?state=PENDING`)
      .set(as(operator));
    const asMember = await request(server())
      .get(`/clubs/${clubId}/applications?state=PENDING`)
      .set(as(member));

    expect(
      asOperator.body.items.map((item: { id: string }) => item.id),
    ).toEqual([applicationId]);
    expect(asMember.status).toBe(403);
  });

  it('신청자는 자기 신청을 보고, 권한 없는 사람에게는 404다', async () => {
    const own = await request(server())
      .get(`/clubs/${clubId}/applications/${applicationId}`)
      .set(as(applicant));
    const notVisible = await request(server())
      .get(`/clubs/${clubId}/applications/${applicationId}`)
      .set(as(member));

    expect([own.status, notVisible.status]).toEqual([200, 404]);
  });

  it('운영진은 남의 신청을 취소할 수 없다(403)', async () => {
    const response = await request(server())
      .delete(`/clubs/${clubId}/applications/${applicationId}`)
      .set(as(operator));

    expect(response.status).toBe(403);
  });

  it('승인하면 신청자가 부원이 되고, 다시 결정하면 409 not-pending이다', async () => {
    const approved = await request(server())
      .patch(`/clubs/${clubId}/applications/${applicationId}`)
      .set(as(operator))
      .send({ state: 'APPROVED' });
    const again = await request(server())
      .patch(`/clubs/${clubId}/applications/${applicationId}`)
      .set(as(operator))
      .send({ state: 'REJECTED' });

    expect(approved.body).toMatchObject({
      state: 'APPROVED',
      decidedAt: expect.any(String),
    });
    const permissions = await request(server())
      .get(`/clubs/${clubId}/members/me/permissions`)
      .set(as(applicant));
    expect(permissions.body.items).toEqual([]);
    expect(JSON.parse(again.text).type).toBe('/problems/not-pending');
  });

  it('부원이 되면 다시 신청할 때 409 already-member다', async () => {
    const response = await request(server())
      .post(`/clubs/${clubId}/applications`)
      .set(as(applicant))
      .send({ partId });

    expect(JSON.parse(response.text).type).toBe('/problems/already-member');
  });

  it('대기 중이면 본인이 취소할 수 있고, 취소하면 다시 신청할 수 있다', async () => {
    const created = await request(server())
      .post(`/clubs/${clubId}/applications`)
      .set(as(other))
      .send({ partId });

    const cancelled = await request(server())
      .delete(`/clubs/${clubId}/applications/${created.body.id}`)
      .set(as(other));
    const again = await request(server())
      .post(`/clubs/${clubId}/applications`)
      .set(as(other))
      .send({ partId });

    expect([cancelled.status, again.status]).toEqual([204, 201]);
  });

  it('거절된 신청은 결정 뒤 7일 동안만 내 신청 내역에 나온다', async () => {
    const user = await database.user.findUniqueOrThrow({
      where: { email: other.email },
    });
    const secondPart = await database.clubPart.findFirstOrThrow({
      where: { clubId: secondClubId },
    });
    const daysAgo = (days: number) =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rejected = (days: number) =>
      database.clubApplication.create({
        data: {
          clubId: secondClubId,
          userId: user.id,
          partId: secondPart.id,
          state: 'REJECTED',
          decidedAt: daysAgo(days),
        },
      });
    const recent = await rejected(6);
    const old = await rejected(8);

    const response = await request(server())
      .get('/clubs/-/applications?userId=me')
      .set(as(other));

    const ids = response.body.items.map((item: { id: string }) => item.id);
    expect(ids).toContain(recent.id);
    expect(ids).not.toContain(old.id);
  });

  it('여러 동아리에 걸친 내 신청은 페이지 토큰으로 페이지네이션하고, 다른 목록의 토큰은 400이다', async () => {
    const secondPart = await database.clubPart.findFirstOrThrow({
      where: { clubId: secondClubId },
    });
    await request(server())
      .post(`/clubs/${secondClubId}/applications`)
      .set(as(applicant))
      .send({ partId: secondPart.id });

    const first = await request(server())
      .get('/clubs/-/applications?userId=me&pageSize=1')
      .set(as(applicant));
    const second = await request(server())
      .get(
        `/clubs/-/applications?userId=me&pageSize=1&pageToken=${first.body.nextPageToken}`,
      )
      .set(as(applicant));
    const wrongList = await request(server())
      .get(
        `/clubs/${clubId}/applications?pageToken=${first.body.nextPageToken}`,
      )
      .set(as(operator));

    expect(first.body.items).toHaveLength(1);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].id).not.toBe(first.body.items[0].id);
    expect(second.body.nextPageToken).toBeUndefined();
    expect(wrongList.status).toBe(400);
  });
});
