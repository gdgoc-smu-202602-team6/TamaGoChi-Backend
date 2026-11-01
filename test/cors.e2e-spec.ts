import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { TestApp } from './test-app.js';

/** TRUSTED_ORIGINS in vitest.config.e2e.ts. */
const trusted = 'https://web.example';
const untrusted = 'https://evil.example';

describe('browser origins', () => {
  const testApp = TestApp.setUp();

  const preflight = (path: string, origin: string) =>
    request(testApp.server())
      .options(path)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

  it('신뢰하는 출처의 preflight이면 204와 그 출처의 허용 헤더를 준다', async () => {
    const response = await preflight('/users/me', trusted);

    expect({
      status: response.status,
      origin: response.headers['access-control-allow-origin'],
      headers: response.headers['access-control-allow-headers'],
    }).toEqual({
      status: 204,
      origin: trusted,
      headers: 'authorization,content-type',
    });
  });

  it('신뢰하는 출처의 better-auth 경로 preflight이면 204를 준다', async () => {
    const response = await preflight('/auth/sign-in/email', trusted);

    expect({
      status: response.status,
      origin: response.headers['access-control-allow-origin'],
    }).toEqual({ status: 204, origin: trusted });
  });

  it('신뢰하지 않는 출처의 preflight이면 허용 헤더를 주지 않는다', async () => {
    const response = await preflight('/users/me', untrusted);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('신뢰하는 출처에서 보낸 실제 요청이면 응답에 그 출처의 허용 헤더를 준다', async () => {
    const response = await request(testApp.server())
      .post('/auth/sign-in/email')
      .set('Origin', trusted)
      .send({ email: `nobody-${randomUUID()}@example.com`, password: 'x' });

    expect(response.headers['access-control-allow-origin']).toBe(trusted);
  });
});
