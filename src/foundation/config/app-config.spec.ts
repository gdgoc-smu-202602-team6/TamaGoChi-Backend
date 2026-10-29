import { AppConfig } from './app-config.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  PUBLIC_URL: 'http://localhost:3000',
};

describe('AppConfig.fromEnv', () => {
  it('값이 맞으면 모든 값을 담는다', () => {
    const config = AppConfig.fromEnv({
      ...valid,
      PORT: '4000',
      NODE_ENV: 'production',
    });

    expect({
      port: config.port,
      databaseUrl: config.databaseUrl,
      production: config.production,
      authSecret: config.authSecret,
      publicUrl: config.publicUrl,
    }).toEqual({
      port: 4000,
      databaseUrl: valid.DATABASE_URL,
      production: true,
      authSecret: valid.BETTER_AUTH_SECRET,
      publicUrl: valid.PUBLIC_URL,
    });
  });

  it('PORT가 없으면 3000을 쓴다', () => {
    expect(AppConfig.fromEnv(valid).port).toBe(3000);
  });

  it('PORT가 65536이면 실패한다', () => {
    expect(() => AppConfig.fromEnv({ ...valid, PORT: '65536' })).toThrow(
      /PORT/,
    );
  });

  it('DATABASE_URL이 없으면 실패한다', () => {
    expect(() =>
      AppConfig.fromEnv({ ...valid, DATABASE_URL: undefined }),
    ).toThrow(/DATABASE_URL/);
  });

  it('BETTER_AUTH_SECRET이 31자이면 실패한다', () => {
    expect(() =>
      AppConfig.fromEnv({ ...valid, BETTER_AUTH_SECRET: 'x'.repeat(31) }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('PUBLIC_URL이 URL이 아니면 실패한다', () => {
    expect(() =>
      AppConfig.fromEnv({ ...valid, PUBLIC_URL: 'localhost' }),
    ).toThrow(/PUBLIC_URL/);
  });
});
