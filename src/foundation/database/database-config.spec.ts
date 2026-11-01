import { DatabaseConfig } from './database-config.js';

const valid = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

describe('DatabaseConfig.fromEnv', () => {
  it('값이 맞으면 주소를 담는다', () => {
    expect(DatabaseConfig.fromEnv(valid).url).toBe(valid.DATABASE_URL);
  });

  it('DATABASE_URL이 없으면 실패한다', () => {
    expect(() =>
      DatabaseConfig.fromEnv({ ...valid, DATABASE_URL: undefined }),
    ).toThrow(/DATABASE_URL/);
  });
});
