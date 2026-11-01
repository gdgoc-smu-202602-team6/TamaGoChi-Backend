import request from 'supertest';
import { insertMember } from './club-fixtures.js';
import { as, type SignedInUser } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('members', () => {
  const testApp = TestApp.setUp();
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
  const path = (memberId: string) => `/clubs/${clubId}/members/${memberId}`;

  beforeAll(async () => {
    [operator, alice, bob] = await Promise.all([
      testApp.signUp('운영자'),
      testApp.signUp('앨리스'),
      testApp.signUp('밥'),
    ]);
    const created = await request(testApp.server())
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
      await testApp.database.clubPart.findFirstOrThrow({
        where: { clubId, name: 'Dev' },
      })
    ).id;
    aiPartId = (
      await testApp.database.clubPart.findFirstOrThrow({
        where: { clubId, name: 'AI' },
      })
    ).id;
    operatorRoleId = (
      await testApp.database.role.findFirstOrThrow({
        where: { assignedOnCreate: true },
      })
    ).id;
    memberRoleId = (
      await testApp.database.role.findFirstOrThrow({
        where: { assignedOnJoin: true },
      })
    ).id;
    aliceMemberId = await insertMember(
      testApp.database,
      { clubId, partId: devPartId },
      alice.email,
      'member',
    );
    bobMemberId = await insertMember(
      testApp.database,
      { clubId, partId: devPartId },
      bob.email,
      'member',
    );
    operatorMemberId = (
      await testApp.database.clubMember.findFirstOrThrow({
        where: { clubId, user: { email: operator.email } },
      })
    ).id;
  });

  afterAll(async () => {
    await testApp.database.club.deleteMany({ where: { id: clubId } });
  });

  it('부원 목록에 닉네임이 있고, 알림 설정은 본인 항목에만 있다', async () => {
    const response = await request(testApp.server())
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
    await request(testApp.server())
      .patch(path('me'))
      .set(as(alice))
      .send({ partId: aiPartId });

    const filtered = await request(testApp.server())
      .get(`/clubs/${clubId}/members?partId=${aiPartId}`)
      .set(as(bob));
    const me = await request(testApp.server()).get(path('me')).set(as(alice));

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
    const response = await request(testApp.server())
      .patch(path(aliceMemberId))
      .set(as(operator))
      .send({ notificationsOn: false });

    expect(response.status).toBe(403);
  });

  it('members.manage 없이 역할을 바꾸면 403이다', async () => {
    const response = await request(testApp.server())
      .patch(path(bobMemberId))
      .set(as(alice))
      .send({ roleId: operatorRoleId });

    expect(response.status).toBe(403);
  });

  it('계약에 없는 필드로는 역할을 바꿀 수 없다', async () => {
    const response = await request(testApp.server())
      .patch(path('me'))
      .set(as(bob))
      .send({ role: { connect: { id: operatorRoleId } } });

    expect(response.status).toBe(200);
    expect(response.body.roleId).toBe(memberRoleId);
  });

  it('하나뿐인 운영진이 스스로 역할을 내려놓으면 409 last-manager다', async () => {
    const response = await request(testApp.server())
      .patch(path('me'))
      .set(as(operator))
      .send({ roleId: memberRoleId });

    expect(JSON.parse(response.text)).toMatchObject({
      status: 409,
      type: '/problems/last-manager',
    });
  });

  it('하나뿐인 운영진은 탈퇴(동아리)도 계정 삭제도 409 last-manager다', async () => {
    const leave = await request(testApp.server())
      .delete(path('me'))
      .set(as(operator));
    const deleteAccount = await request(testApp.server())
      .delete('/users/me')
      .set(as(operator));

    expect([leave.status, deleteAccount.status]).toEqual([409, 409]);
  });

  it('운영진을 하나 더 지정하면 원래 운영진이 내려놓을 수 있다', async () => {
    const promoted = await request(testApp.server())
      .patch(path(aliceMemberId))
      .set(as(operator))
      .send({ roleId: operatorRoleId });

    const steppedDown = await request(testApp.server())
      .patch(path('me'))
      .set(as(operator))
      .send({ roleId: memberRoleId });

    expect(promoted.body.roleId).toBe(operatorRoleId);
    expect(steppedDown.status).toBe(200);
    expect(steppedDown.body.roleId).toBe(memberRoleId);
  });

  it('권한 없는 부원은 남을 강퇴할 수 없고(403), 운영진은 강퇴할 수 있다', async () => {
    const byMember = await request(testApp.server())
      .delete(path(bobMemberId))
      .set(as(operator));
    const byOperator = await request(testApp.server())
      .delete(path(bobMemberId))
      .set(as(alice));

    expect([byMember.status, byOperator.status]).toEqual([403, 204]);
    const after = await request(testApp.server())
      .get(`/clubs/${clubId}/members/me/permissions`)
      .set(as(bob));
    expect(after.status).toBe(404);
  });

  it('부원은 스스로 탈퇴할 수 있다', async () => {
    const response = await request(testApp.server())
      .delete(path(operatorMemberId))
      .set(as(operator));

    expect(response.status).toBe(204);
  });

  it('여러 동아리에 걸친 내 부원 자격을 준다', async () => {
    const response = await request(testApp.server())
      .get('/clubs/-/members?userId=me')
      .set(as(alice));

    expect(
      response.body.items.map((item: { clubId: string }) => item.clubId),
    ).toEqual([clubId]);
  });
});
