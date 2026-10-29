import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.js';

describe('health and the contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health이면 200과 ok를 준다', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect({ status: response.status, body: response.body }).toEqual({
      status: 200,
      body: { status: 'ok' },
    });
  });

  it('명세에 없는 경로이면 404 Problem Details를 준다', async () => {
    const response = await request(app.getHttpServer()).get('/no-such-path');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(JSON.parse(response.text)).toMatchObject({
      type: '/problems/not-found',
      title: 'Not Found',
      status: 404,
    });
  });

  it('토큰 없이 인증이 필요한 경로를 부르면 401과 WWW-Authenticate를 준다', async () => {
    const response = await request(app.getHttpServer()).get('/users/me');

    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Bearer');
    expect(JSON.parse(response.text)).toMatchObject({
      type: '/problems/unauthorized',
      status: 401,
    });
  });

  it('쿼리가 명세의 형식에 어긋나면 400과 필드별 오류를 준다', async () => {
    const response = await request(app.getHttpServer())
      .get('/clubs/not-a-uuid/notices?pageSize=1000')
      .set('Authorization', 'Bearer test');

    expect(response.status).toBe(400);
    const body = JSON.parse(response.text);
    expect(body).toMatchObject({ type: '/problems/bad-request', status: 400 });
    expect(
      body.errors.map((error: { field: string }) => error.field).sort(),
    ).toEqual(['/params/clubId', '/query/pageSize']);
  });
});
