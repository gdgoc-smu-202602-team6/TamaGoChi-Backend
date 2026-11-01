import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DatabaseClient } from '../src/foundation/database/database-client.js';
import { type CapturingAuthMailer, createTestApp } from './test-app.js';

describe('sign-up, sign-in and the current user', () => {
  let app: INestApplication;
  let mailer: CapturingAuthMailer;
  const email = `e2e-${randomUUID()}@example.com`;
  const password = 'correct horse battery 1';

  beforeAll(async () => {
    ({ app, mailer } = await createTestApp());
  });

  afterAll(async () => {
    await app.get(DatabaseClient).user.deleteMany({ where: { email } });
    await app.close();
  });

  const signIn = () =>
    request(app.getHttpServer())
      .post('/auth/sign-in/email')
      .send({ email, password });

  it('가입하면 인증 메일 링크가 생긴다', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({ email, password, name: '  서연 ' });

    expect(response.status).toBe(200);
    expect(mailer.verificationUrls.get(email)).toMatch(
      /\/auth\/verify-email\?token=/,
    );
  });

  it('닉네임이 공백뿐이면 가입을 400으로 거절한다', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({ email: `blank-${email}`, password, name: '   ' });

    expect(response.status).toBe(400);
  });

  it('비밀번호에 숫자가 없으면 가입을 400으로 거절한다', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({
        email: `weak-${email}`,
        password: 'correct horse battery',
        name: '서연',
      });

    expect(response.status).toBe(400);
  });

  it('이메일을 인증하기 전에는 로그인할 수 없다', async () => {
    const response = await signIn();

    expect(response.status).toBe(403);
  });

  it('인증한 뒤 로그인해 받은 토큰으로 /users/me를 읽는다', async () => {
    const link = new URL(mailer.verificationUrls.get(email)!);
    await request(app.getHttpServer()).get(`${link.pathname}${link.search}`);
    const token = (await signIn()).headers['set-auth-token'];

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      email,
      nickname: '서연',
    });
  });

  it('비밀번호를 잊으면 재설정 링크로 바꾸고, 약한 새 비밀번호는 400이다', async () => {
    await request(app.getHttpServer())
      .post('/auth/request-password-reset')
      .send({ email })
      .expect(200);
    const link = new URL(mailer.passwordResetUrls.get(email)!);
    const token = link.pathname.split('/').at(-1);
    const newPassword = 'another horse 2';

    const weak = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'anotherhorse' });
    const reset = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword });
    const signedIn = await request(app.getHttpServer())
      .post('/auth/sign-in/email')
      .send({ email, password: newPassword });

    expect([weak.status, reset.status, signedIn.status]).toEqual([
      400, 200, 200,
    ]);
  });

  it('틀린 토큰이면 401 Problem을 준다', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer wrong');

    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Bearer');
    expect(JSON.parse(response.text)).toMatchObject({
      type: '/problems/unauthorized',
      status: 401,
    });
  });
});
