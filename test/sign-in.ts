import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { CapturingAuthMailer } from './capturing-auth-mailer.js';

export interface SignedInUser {
  readonly id: string;
  readonly email: string;
  readonly token: string;
}

/** The header that sends a request as the signed-in user. */
export const as = (user: SignedInUser) => ({
  Authorization: `Bearer ${user.token}`,
});

/** Signs up a new user, follows the verification link and signs in. */
export async function signUpVerifiedUser(
  app: INestApplication,
  mailer: CapturingAuthMailer,
  nickname = '부원',
): Promise<SignedInUser> {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = 'correct horse battery 1';
  const server = app.getHttpServer();

  await request(server)
    .post('/auth/sign-up/email')
    .send({ email, password, name: nickname })
    .expect(200);
  const link = new URL(mailer.verificationUrls.get(email)!);
  await request(server).get(`${link.pathname}${link.search}`);
  const response = await request(server)
    .post('/auth/sign-in/email')
    .send({ email, password })
    .expect(200);

  return {
    id: response.body.user.id,
    email,
    token: response.headers['set-auth-token'],
  };
}
