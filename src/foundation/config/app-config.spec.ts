import { AppConfig } from './app-config.js';

const validDatabaseUrl = 'postgresql://u:p@localhost:5432/db';

describe('AppConfig.fromEnv', () => {
  it('값이 맞으면 포트와 DB 주소를 담는다', () => {
    const config = AppConfig.fromEnv({ PORT: '4000', DATABASE_URL: validDatabaseUrl });

    expect({ port: config.port, databaseUrl: config.databaseUrl }).toEqual({
      port: 4000,
      databaseUrl: validDatabaseUrl,
    });
  });

  it('PORT가 없으면 3000을 쓴다', () => {
    const config = AppConfig.fromEnv({ DATABASE_URL: validDatabaseUrl });

    expect(config.port).toBe(3000);
  });

  it('PORT가 65536이면 실패한다', () => {
    expect(() => AppConfig.fromEnv({ PORT: '65536', DATABASE_URL: validDatabaseUrl })).toThrow(/PORT/);
  });

  it('DATABASE_URL이 없으면 실패한다', () => {
    expect(() => AppConfig.fromEnv({})).toThrow(/DATABASE_URL/);
  });
});
