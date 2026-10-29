import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/create-app.js';

describe('health and unknown paths', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health이면 200과 ok를 준다', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect({ status: response.status, body: response.body }).toEqual({ status: 200, body: { status: 'ok' } });
  });

  it('없는 경로이면 404 Problem Details를 준다', async () => {
    const response = await request(app.getHttpServer()).get('/no-such-path');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(JSON.parse(response.text)).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Cannot GET /no-such-path',
    });
  });
});
