import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { type SignedInUser, signUpVerifiedUser } from './sign-in.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('/users/me', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  let database: DatabaseClient;
  const emails: string[] = [];

  const signUp = async (nickname?: string): Promise<SignedInUser> => {
    const user = await signUpVerifiedUser(app, mailer, nickname);
    emails.push(user.email);
    return user;
  };
  const as = (user: SignedInUser) => ({ Authorization: `Bearer ${user.token}` });

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
    database = app.get(DatabaseClient);
  });

  afterAll(async () => {
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  describe('PATCH (updateMe)', () => {
    it('닉네임을 다듬어 저장하고 고친 계정을 준다', async () => {
      const user = await signUp('처음');

      const response = await request(app.getHttpServer()).patch('/users/me').set(as(user)).send({ nickname: ' 바뀜 ' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ email: user.email, nickname: '바뀜' });
      const me = await request(app.getHttpServer()).get('/users/me').set(as(user));
      expect(me.body.nickname).toBe('바뀜');
    });

    it('닉네임이 11자이면 400과 필드 오류를 준다', async () => {
      const user = await signUp();

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set(as(user))
        .send({ nickname: '가나다라마바사아자차카' });

      expect(response.status).toBe(400);
      expect(JSON.parse(response.text).errors).toEqual([{ field: '/body/nickname', message: expect.any(String) }]);
    });

    it('바꿀 필드가 없으면 그대로 준다', async () => {
      const user = await signUp('그대로');

      const response = await request(app.getHttpServer()).patch('/users/me').set(as(user)).send({});

      expect(response.status).toBe(200);
      expect(response.body.nickname).toBe('그대로');
    });
  });

  const tokenOf = (token: string) => database.userDeviceToken.findUnique({ where: { token } });

  describe('deviceTokens (putDeviceToken, deleteDeviceToken)', () => {
    it('같은 토큰을 두 번 넣어도 행은 하나다', async () => {
      const user = await signUp();
      const token = `fcm:${user.email}`;

      const first = await request(app.getHttpServer()).put(`/users/me/deviceTokens/${token}`).set(as(user));
      const second = await request(app.getHttpServer()).put(`/users/me/deviceTokens/${token}`).set(as(user));

      expect([first.status, second.status]).toEqual([204, 204]);
      expect(await database.userDeviceToken.count({ where: { token } })).toBe(1);
    });

    it('다른 계정이 같은 토큰을 넣으면 그 계정으로 옮긴다', async () => {
      const before = await signUp();
      const after = await signUp();
      const token = `fcm:${before.email}:moved`;
      await request(app.getHttpServer()).put(`/users/me/deviceTokens/${token}`).set(as(before));

      await request(app.getHttpServer()).put(`/users/me/deviceTokens/${token}`).set(as(after));

      const row = await tokenOf(token);
      const afterUser = await database.user.findUnique({ where: { email: after.email } });
      expect(row?.userId).toBe(afterUser?.id);
    });

    it('남의 토큰은 지우지 않는다', async () => {
      const owner = await signUp();
      const other = await signUp();
      const token = `fcm:${owner.email}:kept`;
      await request(app.getHttpServer()).put(`/users/me/deviceTokens/${token}`).set(as(owner));

      const response = await request(app.getHttpServer()).delete(`/users/me/deviceTokens/${token}`).set(as(other));

      expect(response.status).toBe(204);
      expect(await tokenOf(token)).not.toBeNull();
    });

    it('내 토큰을 지우면 행이 없어진다', async () => {
      const user = await signUp();
      const token = `fcm:${user.email}:gone`;
      await request(app.getHttpServer()).put(`/users/me/deviceTokens/${token}`).set(as(user));

      const response = await request(app.getHttpServer()).delete(`/users/me/deviceTokens/${token}`).set(as(user));

      expect(response.status).toBe(204);
      expect(await tokenOf(token)).toBeNull();
    });
  });

  describe('DELETE (deleteMe)', () => {
    it('탈퇴하면 계정과 기기 토큰이 지워지고 그 토큰은 401이 된다', async () => {
      const user = await signUp();
      const token = `fcm:${user.email}:deleted`;
      await request(app.getHttpServer()).put(`/users/me/deviceTokens/${token}`).set(as(user));

      const response = await request(app.getHttpServer()).delete('/users/me').set(as(user));

      expect(response.status).toBe(204);
      expect(await database.user.findUnique({ where: { email: user.email } })).toBeNull();
      expect(await tokenOf(token)).toBeNull();
      const after = await request(app.getHttpServer()).get('/users/me').set(as(user));
      expect(after.status).toBe(401);
    });
  });
});
