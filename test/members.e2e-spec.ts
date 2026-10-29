import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { insertMember } from './club-fixtures.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('members', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  let operator: SignedInUser;
  let alice: SignedInUser;
  let bob: SignedInUser;
  let clubId: string;
  let devPartId: string;
  let aiPartId: string;
  let operatorRoleId: string;
  let memberRoleId: string;
  let aliceMemberId: string;
  let bobMemberId: string;
  let operatorMemberId: string;
  const as = (user: SignedInUser) => ({
    Authorization: `Bearer ${user.token}`,
  });
  const server = () => app.getHttpServer();
  const path = (memberId: string) => `/clubs/${clubId}/members/${memberId}`;

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
    [operator, alice, bob] = await Promise.all([
      signUpVerifiedUser(app, mailer, '운영자'),
      signUpVerifiedUser(app, mailer, '앨리스'),
      signUpVerifiedUser(app, mailer, '밥'),
    ]);
    const created = await request(server())
      .post('/clubs')
      .set(as(operator))
      .send({
        name: '부원',
        parts: [
          { name: 'Dev', color: 'BLUE' },
          { name: 'AI', color: 'PURPLE' },
        ],
        myPartName: 'Dev',
      });
    clubId = created.body.id;
    devPartId = (
      await database.clubPart.findFirstOrThrow({
        where: { clubId, name: 'Dev' },
      })
    ).id;
    aiPartId = (
      await database.clubPart.findFirstOrThrow({
        where: { clubId, name: 'AI' },
      })
    ).id;
    operatorRoleId = (
      await database.role.findFirstOrThrow({
        where: { assignedOnCreate: true },
      })
    ).id;
    memberRoleId = (
      await database.role.findFirstOrThrow({ where: { assignedOnJoin: true } })
    ).id;
    aliceMemberId = await insertMember(
      database,
      { clubId, partId: devPartId },
      alice.email,
      'member',
    );
    bobMemberId = await insertMember(
      database,
      { clubId, partId: devPartId },
      bob.email,
      'member',
    );
    operatorMemberId = (
      await database.clubMember.findFirstOrThrow({
        where: { clubId, user: { email: operator.email } },
      })
    ).id;
  });

  afterAll(async () => {
    await database.club.deleteMany({ where: { id: clubId } });
    await database.user.deleteMany({
      where: { email: { in: [operator.email, alice.email, bob.email] } },
    });
    await app.close();
  });

  it('부원 목록에 닉네임이 있고, 알림 설정은 본인 항목에만 있다', async () => {
    const response = await request(server())
      .get(`/clubs/${clubId}/members`)
      .set(as(alice));

    expect(response.status).toBe(200);
    const byNickname = Object.fromEntries(
      response.body.items.map(
        (item: { nickname: string; notificationsOn?: boolean }) => [
          item.nickname,
          item.notificationsOn,
        ],
      ),
    );
    expect(byNickname).toEqual({
      운영자: undefined,
      앨리스: true,
      밥: undefined,
    });
  });

  it('파트로 거른 목록과 me 단건을 준다', async () => {
    await request(server())
      .patch(path('me'))
      .set(as(alice))
      .send({ partId: aiPartId });

    const filtered = await request(server())
      .get(`/clubs/${clubId}/members?partId=${aiPartId}`)
      .set(as(bob));
    const me = await request(server()).get(path('me')).set(as(alice));

    expect(filtered.body.items.map((item: { id: string }) => item.id)).toEqual([
      aliceMemberId,
    ]);
    expect(me.body).toMatchObject({
      id: aliceMemberId,
      partId: aiPartId,
      notificationsOn: true,
    });
  });

  it('남의 파트·알림 설정을 바꾸면 403이다', async () => {
    const response = await request(server())
      .patch(path(aliceMemberId))
      .set(as(operator))
      .send({ notificationsOn: false });

    expect(response.status).toBe(403);
  });

  it('members.manage 없이 역할을 바꾸면 403이다', async () => {
    const response = await request(server())
      .patch(path(bobMemberId))
      .set(as(alice))
      .send({ roleId: operatorRoleId });

    expect(response.status).toBe(403);
  });

  it('하나뿐인 운영진이 스스로 역할을 내려놓으면 409 last-manager다', async () => {
    const response = await request(server())
      .patch(path('me'))
      .set(as(operator))
      .send({ roleId: memberRoleId });

    expect(JSON.parse(response.text)).toMatchObject({
      status: 409,
      type: '/problems/last-manager',
    });
  });

  it('하나뿐인 운영진은 탈퇴(동아리)도 계정 삭제도 409 last-manager다', async () => {
    const leave = await request(server()).delete(path('me')).set(as(operator));
    const deleteAccount = await request(server())
      .delete('/users/me')
      .set(as(operator));

    expect([leave.status, deleteAccount.status]).toEqual([409, 409]);
  });

  it('운영진을 하나 더 지정하면 원래 운영진이 내려놓을 수 있다', async () => {
    const promoted = await request(server())
      .patch(path(aliceMemberId))
      .set(as(operator))
      .send({ roleId: operatorRoleId });

    const steppedDown = await request(server())
      .patch(path('me'))
      .set(as(operator))
      .send({ roleId: memberRoleId });

    expect(promoted.body.roleId).toBe(operatorRoleId);
    expect(steppedDown.status).toBe(200);
    expect(steppedDown.body.roleId).toBe(memberRoleId);
  });

  it('권한 없는 부원은 남을 강퇴할 수 없고(403), 운영진은 강퇴할 수 있다', async () => {
    const byMember = await request(server())
      .delete(path(bobMemberId))
      .set(as(operator));
    const byOperator = await request(server())
      .delete(path(bobMemberId))
      .set(as(alice));

    expect([byMember.status, byOperator.status]).toEqual([403, 204]);
    const after = await request(server())
      .get(`/clubs/${clubId}/members/me/permissions`)
      .set(as(bob));
    expect(after.status).toBe(404);
  });

  it('부원은 스스로 탈퇴할 수 있다', async () => {
    const response = await request(server())
      .delete(path(operatorMemberId))
      .set(as(operator));

    expect(response.status).toBe(204);
  });

  it('여러 동아리에 걸친 내 부원 자격을 준다', async () => {
    const response = await request(server())
      .get('/clubs/-/members?userId=me')
      .set(as(alice));

    expect(
      response.body.items.map((item: { clubId: string }) => item.clubId),
    ).toEqual([clubId]);
  });
});
