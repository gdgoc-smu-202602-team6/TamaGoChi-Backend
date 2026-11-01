import request from 'supertest';
import { insertClub } from './club-fixtures.js';
import { as } from './sign-in.js';
import { TestApp } from './test-app.js';

describe('/users/me', () => {
  const testApp = TestApp.setUp();

  describe('PATCH (updateMe)', () => {
    it('닉네임 앞뒤 공백을 제거해 저장하고 수정한 계정을 준다', async () => {
      const user = await testApp.signUp('처음');

      const response = await request(testApp.server())
        .patch('/users/me')
        .set(as(user))
        .send({ nickname: ' 바뀜 ' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: user.email,
        nickname: '바뀜',
      });
      const me = await request(testApp.server()).get('/users/me').set(as(user));
      expect(me.body.nickname).toBe('바뀜');
    });

    it('닉네임이 11자이면 400과 필드 오류를 준다', async () => {
      const user = await testApp.signUp();

      const response = await request(testApp.server())
        .patch('/users/me')
        .set(as(user))
        .send({ nickname: '가나다라마바사아자차카' });

      expect(response.status).toBe(400);
      expect(JSON.parse(response.text).errors).toEqual([
        { field: '/body/nickname', message: expect.any(String) },
      ]);
    });

    it('바꿀 필드가 없으면 그대로 준다', async () => {
      const user = await testApp.signUp('그대로');

      const response = await request(testApp.server())
        .patch('/users/me')
        .set(as(user))
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.nickname).toBe('그대로');
    });
  });

  const tokenOf = (token: string) =>
    testApp.database.userDeviceToken.findUnique({ where: { token } });

  describe('deviceTokens (putDeviceToken, deleteDeviceToken)', () => {
    it('같은 토큰을 두 번 넣어도 행은 하나다', async () => {
      const user = await testApp.signUp();
      const token = `fcm:${user.email}`;

      const first = await request(testApp.server())
        .put(`/users/me/deviceTokens/${token}`)
        .set(as(user));
      const second = await request(testApp.server())
        .put(`/users/me/deviceTokens/${token}`)
        .set(as(user));

      expect([first.status, second.status]).toEqual([204, 204]);
      expect(
        await testApp.database.userDeviceToken.count({ where: { token } }),
      ).toBe(1);
    });

    it('다른 계정이 같은 토큰을 넣으면 그 계정으로 옮긴다', async () => {
      const before = await testApp.signUp();
      const after = await testApp.signUp();
      const token = `fcm:${before.email}:moved`;
      await request(testApp.server())
        .put(`/users/me/deviceTokens/${token}`)
        .set(as(before));

      await request(testApp.server())
        .put(`/users/me/deviceTokens/${token}`)
        .set(as(after));

      const row = await tokenOf(token);
      const afterUser = await testApp.database.user.findUnique({
        where: { email: after.email },
      });
      expect(row?.userId).toBe(afterUser?.id);
    });

    it('남의 토큰은 삭제하지 않는다', async () => {
      const owner = await testApp.signUp();
      const other = await testApp.signUp();
      const token = `fcm:${owner.email}:kept`;
      await request(testApp.server())
        .put(`/users/me/deviceTokens/${token}`)
        .set(as(owner));

      const response = await request(testApp.server())
        .delete(`/users/me/deviceTokens/${token}`)
        .set(as(other));

      expect(response.status).toBe(204);
      expect(await tokenOf(token)).not.toBeNull();
    });

    it('내 토큰을 삭제하면 행이 없어진다', async () => {
      const user = await testApp.signUp();
      const token = `fcm:${user.email}:gone`;
      await request(testApp.server())
        .put(`/users/me/deviceTokens/${token}`)
        .set(as(user));

      const response = await request(testApp.server())
        .delete(`/users/me/deviceTokens/${token}`)
        .set(as(user));

      expect(response.status).toBe(204);
      expect(await tokenOf(token)).toBeNull();
    });
  });

  describe('DELETE (deleteMe)', () => {
    it('탈퇴하면 계정과 기기 토큰이 삭제되고 그 토큰은 401이 된다', async () => {
      const user = await testApp.signUp();
      const token = `fcm:${user.email}:deleted`;
      await request(testApp.server())
        .put(`/users/me/deviceTokens/${token}`)
        .set(as(user));

      const response = await request(testApp.server())
        .delete('/users/me')
        .set(as(user));

      expect(response.status).toBe(204);
      expect(
        await testApp.database.user.findUnique({
          where: { email: user.email },
        }),
      ).toBeNull();
      expect(await tokenOf(token)).toBeNull();
      const after = await request(testApp.server())
        .get('/users/me')
        .set(as(user));
      expect(after.status).toBe(401);
    });

    it('탈퇴해도 쓴 공지와 방명록은 남고 작성자가 null이 된다', async () => {
      const [author, host] = await Promise.all([
        testApp.signUp(),
        testApp.signUp(),
      ]);
      const [authorRow, hostRow] = await Promise.all(
        [author, host].map((user) =>
          testApp.database.user.findUniqueOrThrow({
            where: { email: user.email },
          }),
        ),
      );
      const { clubId } = await insertClub(testApp.database);
      const category = await testApp.database.clubNoticeCategory.create({
        data: { clubId, name: '전체공지', color: 'RED', preset: true },
      });
      const notice = await testApp.database.clubNotice.create({
        data: {
          clubId,
          categoryId: category.id,
          authorUserId: authorRow.id,
          title: '제목',
          body: '본문',
          notificationState: 'NONE',
        },
      });
      const entry = await testApp.database.userGuestbookEntry.create({
        data: {
          userId: hostRow.id,
          clubId,
          authorUserId: authorRow.id,
          body: '놀러 왔어요',
        },
      });

      await request(testApp.server()).delete('/users/me').set(as(author));

      const [noticeAfter, entryAfter] = await Promise.all([
        testApp.database.clubNotice.findUnique({ where: { id: notice.id } }),
        testApp.database.userGuestbookEntry.findUnique({
          where: { id: entry.id },
        }),
      ]);
      await testApp.database.club.delete({ where: { id: clubId } });
      expect(noticeAfter).toMatchObject({ title: '제목', authorUserId: null });
      expect(entryAfter).toMatchObject({
        body: '놀러 왔어요',
        authorUserId: null,
      });
    });
  });
});
